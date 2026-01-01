import * as Sentry from '@sentry/react-native'
import { useSDKSafe } from '@stump/client'
import { OPDSMetadata, OPDSPublication } from '@stump/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { and, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as FileSystem from 'expo-file-system/legacy'
import { useEffect, useMemo } from 'react'

import { useActiveServerSafe } from '~/components/activeServer'
import { extensionFromMime, getAcquisitionLink, getPublicationId } from '~/components/opds/utils'
import { db, downloadedFiles, DownloadRepository } from '~/db'
import { booksDirectory, bookThumbnailPath, ensureDirectoryExists } from '~/lib/filesystem'

const downloadKeys = {
	all: ['downloads'] as const,
	server: (serverID: string) => [...downloadKeys.all, 'server', serverID] as const,
	opdsBook: (bookID: string, serverID: string) =>
		[...downloadKeys.all, 'opds-book', bookID, serverID] as const,
}

type DownloadOPDSBookParams = {
	/**
	 * The URL to the publication manifest. If the publication lacks any identifier in metadata,
	 * this will be used to generate an ID
	 */
	publicationUrl: string
	publication: OPDSPublication
}

export type UseOPDSDownloadParams = {
	serverId?: string
}

export function useIsOPDSPublicationDownloaded(
	publicationUrl: string,
	metadata: OPDSMetadata | null | undefined,
	serverID?: string,
) {
	const activeServerCtx = useActiveServerSafe()
	const effectiveServerID = serverID ?? activeServerCtx?.activeServer.id

	const bookID = useMemo(() => {
		return getPublicationId(publicationUrl, metadata)
	}, [publicationUrl, metadata])

	const {
		data: [downloadedFile],
	} = useLiveQuery(
		db
			.select({ id: downloadedFiles.id })
			.from(downloadedFiles)
			.where(
				and(eq(downloadedFiles.id, bookID), eq(downloadedFiles.serverId, effectiveServerID || '')),
			)
			.limit(1),
	)
	const isDownloaded = !!downloadedFile as boolean

	return isDownloaded
}

export function useOPDSDownload({ serverId }: UseOPDSDownloadParams = {}) {
	const activeServerCtx = useActiveServerSafe()
	const serverID = serverId ?? activeServerCtx?.activeServer.id

	const sdkCtx = useSDKSafe()
	const queryClient = useQueryClient()

	// Ensure books directory exists
	useEffect(() => {
		if (serverID) {
			ensureDirectoryExists(booksDirectory(serverID))
		}
	}, [serverID])

	const downloadMutation = useMutation({
		mutationFn: async ({ publicationUrl, publication }: DownloadOPDSBookParams) => {
			if (!serverID) {
				throw new Error('No active server available for downloads')
			}

			if (!sdkCtx?.sdk) {
				throw new Error('SDK is not initialized')
			}

			const { sdk } = sdkCtx

			await ensureDirectoryExists(booksDirectory(serverID))

			const { metadata, links } = publication
			const bookID = getPublicationId(publicationUrl, metadata)

			const existingBook = await DownloadRepository.getFile(bookID, serverID)
			if (existingBook) {
				return `${booksDirectory(serverID)}/${existingBook.filename}`
			}

			const acquisitionLink = getAcquisitionLink(links)
			if (!acquisitionLink?.href) {
				throw new Error('No acquisition link found for this publication')
			}

			const extension = extensionFromMime(acquisitionLink.type)
			if (!extension) {
				throw new Error(`Unsupported file type: ${acquisitionLink.type || 'unknown'}`)
			}

			const downloadUrl = acquisitionLink.href
			const filename = `${bookID}.${extension}`
			const placementUrl = `${booksDirectory(serverID)}/${filename}`

			const result = await FileSystem.downloadAsync(downloadUrl, placementUrl, {
				headers: sdk.headers,
			})

			if (result.status !== 200) {
				throw new Error(`Failed to download file, status code: ${result.status}`)
			}

			const size = Number(result.headers['Content-Length'] ?? 0)

			await DownloadRepository.addFile({
				id: bookID,
				filename,
				uri: result.uri,
				serverId: serverID,
				size: !isNaN(size) && size > 0 ? size : undefined,
				bookName: metadata?.title,
				metadata: {
					title: metadata?.title,
					summary: metadata?.description ?? undefined,
				},
			})

			return result.uri
		},
		onSuccess: (_, variables) => {
			if (!serverID) return
			const bookID = getPublicationId(variables.publicationUrl, variables.publication.metadata)
			queryClient.invalidateQueries({ queryKey: downloadKeys.server(serverID) })
			queryClient.invalidateQueries({ queryKey: downloadKeys.opdsBook(bookID, serverID) })
		},
	})

	const deleteMutation = useMutation({
		mutationFn: async ({
			publicationUrl,
			metadata,
		}: {
			publicationUrl: string
			metadata?: OPDSMetadata | null
		}) => {
			if (!serverID) {
				throw new Error('No active server available for deleting downloads')
			}

			const bookID = getPublicationId(publicationUrl, metadata)
			const file = await DownloadRepository.getFile(bookID, serverID)
			if (!file) {
				console.warn('File not found in download store')
				return
			}

			const fileUri = `${booksDirectory(serverID)}/${file.filename}`
			try {
				const info = await FileSystem.getInfoAsync(fileUri)
				if (info.exists) {
					await FileSystem.deleteAsync(fileUri)
				}
			} catch (e) {
				Sentry.withScope((scope) => {
					scope.setTag('action', 'delete downloaded OPDS file')
					scope.setExtra('bookID', bookID)
					scope.setExtra('fileUri', fileUri)
					Sentry.captureException(e)
				})
				console.error('Error deleting file:', e)
			}

			const thumbnailPath = bookThumbnailPath(serverID, bookID)
			try {
				const thumbInfo = await FileSystem.getInfoAsync(thumbnailPath)
				if (thumbInfo.exists) {
					await FileSystem.deleteAsync(thumbnailPath)
				}
			} catch (e) {
				Sentry.withScope((scope) => {
					scope.setTag('action', 'delete OPDS book thumbnail')
					scope.setExtra('bookID', bookID)
					scope.setExtra('thumbnailPath', thumbnailPath)
					Sentry.captureException(e)
				})
				console.error('Error deleting thumbnail:', e)
			}

			await DownloadRepository.deleteFile(bookID, serverID)
		},
		onSuccess: (_, { publicationUrl, metadata }) => {
			if (!serverID) return
			const bookID = getPublicationId(publicationUrl, metadata)
			queryClient.invalidateQueries({ queryKey: downloadKeys.server(serverID) })
			queryClient.invalidateQueries({ queryKey: downloadKeys.opdsBook(bookID, serverID) })
		},
	})

	return {
		downloadBook: downloadMutation.mutateAsync,
		deleteBook: (publicationUrl: string, metadata?: OPDSMetadata | null) =>
			deleteMutation.mutateAsync({ publicationUrl, metadata }),
		isDownloading: downloadMutation.isPending,
		isDeleting: deleteMutation.isPending,
		downloadError: downloadMutation.error,
		deleteError: deleteMutation.error,
	}
}
