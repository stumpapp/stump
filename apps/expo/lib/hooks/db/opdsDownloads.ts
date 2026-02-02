import * as Sentry from '@sentry/react-native'
import { OPDSMetadata } from '@stump/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { and, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as FileSystem from 'expo-file-system/legacy'
import { useEffect, useMemo } from 'react'

import { useActiveServerSafe } from '~/components/activeServer'
import { getPublicationId } from '~/components/opds/utils'
import { db, downloadedFiles, DownloadRepository } from '~/db'
import { booksDirectory, bookThumbnailPath, ensureDirectoryExists } from '~/lib/filesystem'

import { useDownloadQueue } from './downloadQueue'

// TODO(opds): See if I can just use a few intersection types to remove this and unify
// with downloads.ts. I originally split because it was quicker, and not saying unify is the
// way, but ideally I can cut down on maintaince by minimizing that

const downloadKeys = {
	all: ['downloads'] as const,
	server: (serverID: string) => [...downloadKeys.all, 'server', serverID] as const,
	opdsBook: (bookID: string, serverID: string) =>
		[...downloadKeys.all, 'opds-book', bookID, serverID] as const,
}

export type UseOPDSDownloadParams = {
	serverId?: string
}

/**
 * A hook to determine if an OPDS v2.0 publication is downloaded. For OPDS v1.2, use {@link useIsLegacyOPDSEntryDownloaded}
 *
 * @param publicationUrl The URL at which the book can be downloaded
 * @param metadata Any metadata present which will be used for display purposes offline
 * @param serverID The server ID to check against. If not provided, will use the active server
 * @returns
 */
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

/**
 * A hook to determine if a legacy OPDS v1.2 entry is downloaded. For OPDS v2.0, use {@link useIsOPDSPublicationDownloaded}
 *
 * @param entryId The ID of the entry as pulled from the XML
 * @param serverID The server ID to check against. If not provided, will use the active server
 */
export function useIsLegacyOPDSEntryDownloaded(entryId: string, serverID?: string) {
	const activeServerCtx = useActiveServerSafe()
	const effectiveServerID = serverID ?? activeServerCtx?.activeServer.id

	const {
		data: [downloadedFile],
	} = useLiveQuery(
		db
			.select({ id: downloadedFiles.id })
			.from(downloadedFiles)
			.where(
				and(eq(downloadedFiles.id, entryId), eq(downloadedFiles.serverId, effectiveServerID || '')),
			)
			.limit(1),
	)
	const isDownloaded = !!downloadedFile as boolean

	return isDownloaded
}

/**
 * A hook to manage OPDS book downloads, including downloading and deleting books.
 *
 * Note: This hook is largely centered around OPDS v2.0 interactions. For legacy OPDS v1.2 support,
 * there were a few tweaks that were made, particularly around book idents.
 */
export function useOPDSDownload({ serverId }: UseOPDSDownloadParams = {}) {
	const activeServerCtx = useActiveServerSafe()
	const serverID = serverId ?? activeServerCtx?.activeServer.id

	const queryClient = useQueryClient()

	const { enqueueOPDSBook, counts: queueCounts } = useDownloadQueue({ serverId: serverID })

	useEffect(() => {
		if (serverID) {
			ensureDirectoryExists(booksDirectory(serverID))
		}
	}, [serverID])

	type DeleteParams = {
		/**
		 * The ID of the book to delete. If not provided, it will be derived from the publicationUrl and metadata.
		 *
		 * Note: This should only be used for legacy OPDS v1.2 entries that have a stable ID derived directly from
		 * the feed.
		 */
		id?: string
		/**
		 * The URL at which the publication can be downloaded. If `id` is not provided, this will be used to
		 * generate the book ID.
		 */
		publicationUrl: string
		metadata?: OPDSMetadata | null
	}

	const deleteMutation = useMutation({
		mutationFn: async ({ id, publicationUrl, metadata }: DeleteParams) => {
			if (!serverID) {
				throw new Error('No active server available for deleting downloads')
			}

			const bookID = id || getPublicationId(publicationUrl, metadata)
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
		downloadBook: enqueueOPDSBook,
		deleteBook: (params: DeleteParams) => deleteMutation.mutateAsync(params),
		isDownloading: Boolean(queueCounts.pending + queueCounts.downloading > 0),
		isDeleting: deleteMutation.isPending,
		deleteError: deleteMutation.error,
	}
}
