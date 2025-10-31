import * as Sentry from '@sentry/react-native'
import { useSDKSafe } from '@stump/client'
import { MediaMetadata, ReadiumLocator } from '@stump/graphql'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { and, count, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as FileSystem from 'expo-file-system/legacy'
import { useEffect } from 'react'

import { useActiveServerSafe } from '~/components/activeServer'
import { useDownloadsState } from '~/components/downloads/store'
import { db, downloadedFiles, DownloadRepository } from '~/db'
import { booksDirectory, bookThumbnailPath, ensureDirectoryExists } from '~/lib/filesystem'
import { useSavedServerStore } from '~/stores/savedServer'

const downloadKeys = {
	all: ['downloads'] as const,
	server: (serverID: string) => [...downloadKeys.all, 'server', serverID] as const,
	book: (bookID: string, serverID: string) =>
		[...downloadKeys.all, 'book', bookID, serverID] as const,
}

type DeleteBookParams = {
	bookId: string
	serverId?: string
}

type DeleteManyBooksParams = {
	bookIds: string[]
	serverId?: string
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
	bookName?: string | null
	metadata?: Partial<MediaMetadata> | null
	toc?: string[] | null
	readProgress?: {
		percentageCompleted?: string | null
		page?: number | null
		elapsedSeconds?: number | null
		locator?: ReadiumLocator | null
		updatedAt?: Date | null
	} | null
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

	const allServerIds = useSavedServerStore((state) => state.servers.map((srv) => srv.id))

	const sdkCtx = useSDKSafe()

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

			if (!sdkCtx?.sdk) {
				throw new Error('SDK is not initialized')
			}

			const { sdk } = sdkCtx

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
					uri: result.uri,
					serverId: serverID,
					size: !isNaN(size) && size > 0 ? size : undefined,
					metadata: params.metadata,
					seriesId: params.seriesId,
					bookName: params.bookName,
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
					existingProgression: params.readProgress,
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
		mutationFn: async ({ bookId, serverId: paramServerId }: DeleteBookParams) => {
			const effectiveServerId = paramServerId ?? serverID
			if (!effectiveServerId) {
				throw new Error('No active server available for deleting downloads')
			}

			const file = await DownloadRepository.getFile(bookId, effectiveServerId)
			if (!file) {
				console.warn('File not found in download store')
				return
			}

			const fileUri = `${booksDirectory(effectiveServerId)}/${file.filename}`
			try {
				const info = await FileSystem.getInfoAsync(fileUri)
				if (info.exists) {
					await FileSystem.deleteAsync(fileUri)
				}
			} catch (e) {
				Sentry.withScope((scope) => {
					scope.setTag('action', 'delete downloaded file')
					scope.setExtra('bookID', bookId)
					scope.setExtra('fileUri', fileUri)
					Sentry.captureException(e)
				})
				console.error('Error deleting file:', e)
			}

			const thumbnailPath = bookThumbnailPath(effectiveServerId, bookId)
			try {
				const thumbInfo = await FileSystem.getInfoAsync(thumbnailPath)
				if (thumbInfo.exists) {
					await FileSystem.deleteAsync(thumbnailPath)
				}
			} catch (e) {
				Sentry.withScope((scope) => {
					scope.setTag('action', 'delete book thumbnail')
					scope.setExtra('bookID', bookId)
					scope.setExtra('thumbnailPath', thumbnailPath)
					Sentry.captureException(e)
				})
				console.error('Error deleting thumbnail:', e)
			}

			await DownloadRepository.deleteFile(bookId, effectiveServerId)
		},
		onSuccess: (_, { bookId, serverId: paramServerId }) => {
			const effectiveServerId = paramServerId ?? serverID
			if (!effectiveServerId) return
			queryClient.invalidateQueries({ queryKey: downloadKeys.server(effectiveServerId) })
			queryClient.invalidateQueries({ queryKey: downloadKeys.book(bookId, effectiveServerId) })
		},
	})

	const deleteManyMutation = useMutation({
		mutationFn: async ({ bookIds, serverId: paramServerId }: DeleteManyBooksParams) => {
			const effectiveServerId = paramServerId ?? serverID
			if (!effectiveServerId) {
				throw new Error('No active server available for deleting downloads')
			}

			for (const bookID of bookIds) {
				const file = await DownloadRepository.getFile(bookID, effectiveServerId)
				if (!file) {
					console.warn(`File with ID ${bookID} not found in download store`)
					continue
				}

				const fileUri = `${booksDirectory(effectiveServerId)}/${file.filename}`
				try {
					const info = await FileSystem.getInfoAsync(fileUri)
					if (info.exists) {
						await FileSystem.deleteAsync(fileUri)
					}
				} catch (e) {
					Sentry.withScope((scope) => {
						scope.setTag('action', 'delete downloaded file (batch)')
						scope.setExtra('bookID', bookID)
						scope.setExtra('fileUri', fileUri)
						Sentry.captureException(e)
					})
					console.error(`Error deleting file with ID ${bookID}:`, e)
				}

				const thumbnailPath = bookThumbnailPath(effectiveServerId, bookID)
				try {
					const thumbInfo = await FileSystem.getInfoAsync(thumbnailPath)
					if (thumbInfo.exists) {
						await FileSystem.deleteAsync(thumbnailPath)
					}
				} catch (e) {
					Sentry.withScope((scope) => {
						scope.setTag('action', 'delete book thumbnail (batch)')
						scope.setExtra('bookID', bookID)
						scope.setExtra('thumbnailPath', thumbnailPath)
						Sentry.captureException(e)
					})
					console.error(`Error deleting thumbnail for book ID ${bookID}:`, e)
				}

				await DownloadRepository.deleteFile(bookID, effectiveServerId)
			}
		},
		onSuccess: (_, { bookIds, serverId: paramServerId }) => {
			const effectiveServerId = paramServerId ?? serverID
			if (!effectiveServerId) return
			queryClient.invalidateQueries({ queryKey: downloadKeys.server(effectiveServerId) })
			Promise.all(
				bookIds.map((bookID) =>
					queryClient.invalidateQueries({ queryKey: downloadKeys.book(bookID, effectiveServerId) }),
				),
			)
		},
	})

	const deleteAllDownloadsMutation = useMutation({
		mutationFn: async () => {
			console.warn('Deleting all downloads for all servers...', allServerIds)
			return Promise.all(
				allServerIds.map(async (srvID) => {
					const downloads = await DownloadRepository.getFilesByServer(srvID)
					console.warn(`Found ${downloads.length} downloads for server ${srvID}`)
					const bookIDs = downloads.map((download) => download.id)
					console.warn(`Deleting downloads for book IDs: ${bookIDs.join(', ')}`)
					return deleteManyMutation.mutateAsync({ bookIds: bookIDs, serverId: srvID })
				}),
			)
		},
	})

	const deleteServerDownloadsMutation = useMutation({
		mutationFn: async (serverId: string) => {
			const downloads = await DownloadRepository.getFilesByServer(serverId)
			const bookIDs = downloads.map((download) => download.id)
			return deleteManyMutation.mutateAsync({ bookIds: bookIDs, serverId })
		},
	})

	return {
		downloadBook: downloadMutation.mutateAsync,
		deleteBook: (bookId: string, serverId?: string) =>
			deleteMutation.mutateAsync({ bookId, serverId }),
		deleteManyBooks: (bookIds: string[], serverId?: string) =>
			deleteManyMutation.mutateAsync({ bookIds, serverId }),
		deleteAllDownloads: deleteAllDownloadsMutation.mutateAsync,
		deleteServerDownloads: deleteServerDownloadsMutation.mutateAsync,
		isDownloading: downloadMutation.isPending,
		isDeleting: deleteMutation.isPending,
		downloadError: downloadMutation.error,
		deleteError: deleteMutation.error,
	}
}

export function useDownloadsCount() {
	const fetchCounter = useDownloadsState((state) => state.fetchCounter)
	const {
		data: [result],
	} = useLiveQuery(db.select({ count: count() }).from(downloadedFiles), [
		'downloads-count',
		fetchCounter,
	])
	return result?.count || 0
}
