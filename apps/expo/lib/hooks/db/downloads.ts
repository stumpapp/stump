import { useSDK } from '@stump/client'
import { MediaMetadata } from '@stump/graphql'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { and, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as FileSystem from 'expo-file-system/legacy'
import { useCallback, useEffect } from 'react'

import { useActiveServerSafe } from '~/components/activeServer'
import { db, downloadedFiles, DownloadRepository } from '~/db'
import { booksDirectory, ensureDirectoryExists } from '~/lib/filesystem'

const downloadKeys = {
	all: ['downloads'] as const,
	server: (serverID: string) => [...downloadKeys.all, 'server', serverID] as const,
	book: (bookID: string, serverID: string) =>
		[...downloadKeys.all, 'book', bookID, serverID] as const,
}

/**
 * Hook to get all downloaded files for the active server
 */
export function useServerDownloads(serverID?: string) {
	const activeServerCtx = useActiveServerSafe()
	const effectiveServerID = serverID ?? activeServerCtx?.activeServer.id

	return useQuery({
		queryKey: downloadKeys.server(effectiveServerID ?? 'no-server'),
		queryFn: () => {
			if (!effectiveServerID) return []
			return DownloadRepository.getFilesByServer(effectiveServerID)
		},
		enabled: !!effectiveServerID,
	})
}

/**
 * Hook to check if a specific book is downloaded
 */
export function useIsBookDownloaded(bookID: string, serverID?: string) {
	const activeServerCtx = useActiveServerSafe()
	const effectiveServerID = serverID ?? activeServerCtx?.activeServer.id

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

type DownloadBookParams = {
	id: string
	url?: string | null
	extension: string
	seriesId?: string | null
	seriesName?: string | null
	libraryId?: string | null
	libraryName?: string | null
	metadata?: Partial<MediaMetadata> | null
}

export type UseDownloadParams = {
	serverId?: string
}

/**
 * Main hook for download operations (download, delete, check status)
 */
export function useDownload({ serverId }: UseDownloadParams = {}) {
	const activeServerCtx = useActiveServerSafe()
	const serverID = serverId ?? activeServerCtx?.activeServer.id

	const { sdk } = useSDK()

	const queryClient = useQueryClient()

	// Ensure books directory exists
	useEffect(() => {
		if (serverID) {
			ensureDirectoryExists(booksDirectory(serverID))
		}
	}, [serverID])

	const downloadMutation = useMutation({
		mutationFn: async (params: DownloadBookParams) => {
			if (!serverID) {
				throw new Error('No active server available for downloads')
			}

			await ensureDirectoryExists(booksDirectory(serverID))

			// Check if already downloaded
			const existingBook = await DownloadRepository.getFile(params.id, serverID)
			if (existingBook) {
				return `${booksDirectory(serverID)}/${existingBook.filename}`
			}

			const downloadUrl = params.url || sdk.media.downloadURL(params.id)
			const filename = `${params.id}.${params.extension}`
			const placementUrl = `${booksDirectory(serverID)}/${filename}`

			// Only then download the file
			const result = await FileSystem.downloadAsync(downloadUrl, placementUrl, {
				headers: sdk.headers,
			})

			if (result.status !== 200) {
				throw new Error(`Failed to download file, status code: ${result.status}`)
			}

			const size = Number(result.headers['Content-Length'] ?? 0)

			await DownloadRepository.addFile(
				{
					id: params.id,
					filename,
					serverId: serverID,
					size: !isNaN(size) && size > 0 ? size : undefined,
					metadata: params.metadata,
					seriesId: params.seriesId,
				},
				{
					seriesRef:
						params.seriesId && params.seriesName
							? { id: params.seriesId, name: params.seriesName, libraryId: params.libraryId }
							: undefined,
					libraryRef:
						params.libraryId && params.libraryName
							? { id: params.libraryId, name: params.libraryName }
							: undefined,
				},
			)

			return result.uri
		},
		onSuccess: (_, variables) => {
			if (!serverID) return
			queryClient.invalidateQueries({ queryKey: downloadKeys.server(serverID) })
			queryClient.invalidateQueries({ queryKey: downloadKeys.book(variables.id, serverID) })
		},
	})

	const deleteMutation = useMutation({
		mutationFn: async (bookID: string) => {
			if (!serverID) {
				throw new Error('No active server available for deleting downloads')
			}

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
				console.error('Error deleting file:', e)
			}

			await DownloadRepository.deleteFile(bookID, serverID)
		},
		onSuccess: (_, bookID) => {
			if (!serverID) return
			queryClient.invalidateQueries({ queryKey: downloadKeys.server(serverID) })
			queryClient.invalidateQueries({ queryKey: downloadKeys.book(bookID, serverID) })
		},
	})

	const downloadBook = useCallback(
		(params: DownloadBookParams) => {
			return downloadMutation.mutateAsync(params)
		},
		[downloadMutation],
	)

	const deleteBook = useCallback(
		(bookID: string) => {
			return deleteMutation.mutateAsync(bookID)
		},
		[deleteMutation],
	)

	return {
		downloadBook,
		deleteBook,
		isDownloading: downloadMutation.isPending,
		isDeleting: deleteMutation.isPending,
		downloadError: downloadMutation.error,
		deleteError: deleteMutation.error,
	}
}
