import * as Sentry from '@sentry/react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { and, count, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as FileSystem from 'expo-file-system/legacy'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner-native'

import { useActiveServerSafe } from '~/components/activeServer'
import { useDownloadsState } from '~/components/localLibrary/store'
import { db, downloadedFiles, DownloadRepository, readProgress } from '~/db'
import {
	type DownloadProgress,
	type DownloadQueueMetadata,
	getDownloadQueueManager,
} from '~/lib/downloadQueue'
import { booksDirectory, bookThumbnailPath, ensureDirectoryExists } from '~/lib/filesystem'
import { LOCAL_LIBRARY_SERVER_ID } from '~/lib/localLibrary'
import { useSavedServerStore } from '~/stores/savedServer'

import { type EnqueueBookParams, useDownloadQueue } from './downloadQueue'

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

export type UseDownloadParams = {
	serverId?: string
}

export function useDownload({ serverId }: UseDownloadParams = {}) {
	const activeServerCtx = useActiveServerSafe()
	const serverID = serverId ?? activeServerCtx?.activeServer.id

	const allServerIds = useSavedServerStore((state) => state.servers.map((srv) => srv.id))

	const queryClient = useQueryClient()

	const { enqueueBook, counts: queueCounts } = useDownloadQueue({ serverId: serverID })

	useEffect(() => {
		if (serverID) {
			ensureDirectoryExists(booksDirectory(serverID))
		}
	}, [serverID])

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
				[...allServerIds, LOCAL_LIBRARY_SERVER_ID].map(async (srvID) => {
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

	const markAsComplete = useCallback(
		async (bookId: string, totalPages?: number | null) => {
			const effectiveServerId = serverID
			if (!effectiveServerId) {
				throw new Error('No active server available')
			}

			try {
				const existingProgress = await db
					.select()
					.from(readProgress)
					.where(eq(readProgress.bookId, bookId))
					.get()

				if (existingProgress) {
					await db
						.update(readProgress)
						.set({
							percentage: '1.0',
							page: totalPages ?? existingProgress.page,
							lastModified: new Date(),
						})
						.where(eq(readProgress.bookId, bookId))
				} else {
					await db.insert(readProgress).values({
						bookId,
						serverId: effectiveServerId,
						percentage: '1.0',
						page: totalPages ?? undefined,
						lastModified: new Date(),
					})
				}

				queryClient.invalidateQueries({ queryKey: downloadKeys.server(effectiveServerId) })
			} catch (error) {
				Sentry.captureException(error)
				toast.error('Failed to mark as complete')
				throw error
			}
		},
		[serverID, queryClient],
	)

	const clearProgress = useCallback(
		async (bookId: string) => {
			const effectiveServerId = serverID
			if (!effectiveServerId) {
				throw new Error('No active server available')
			}

			try {
				await db.delete(readProgress).where(eq(readProgress.bookId, bookId))
				queryClient.invalidateQueries({ queryKey: downloadKeys.server(effectiveServerId) })
			} catch (error) {
				Sentry.captureException(error)
				toast.error('Failed to clear progress')
				throw error
			}
		},
		[serverID, queryClient],
	)

	const downloadImmediate = useCallback(
		async (
			params: Omit<EnqueueBookParams, 'url'> & { url: string },
			onProgress?: (progress: DownloadProgress) => void,
		) => {
			const effectiveServerId = serverID
			if (!effectiveServerId) {
				throw new Error('No active server available')
			}

			const filename = `${params.id}.${params.extension}`

			const metadata: DownloadQueueMetadata = {
				bookName: params.bookName ?? params.metadata?.title,
				seriesId: params.seriesId,
				seriesName: params.seriesName,
				libraryId: params.libraryId,
				libraryName: params.libraryName,
				thumbnailMeta: params.thumbnailMeta,
				toc: params.toc,
				bookMetadata: params.metadata,
				readProgress: params.readProgress,
			}

			const manager = getDownloadQueueManager()
			return manager.downloadImmediate(
				{
					bookId: params.id,
					serverId: effectiveServerId,
					downloadUrl: params.url,
					filename,
					extension: params.extension,
					metadata,
				},
				onProgress,
			)
		},
		[serverID],
	)

	return {
		downloadBook: enqueueBook,
		downloadImmediate,
		deleteBook: (bookId: string, serverId?: string) =>
			deleteMutation.mutateAsync({ bookId, serverId }),
		deleteManyBooks: (bookIds: string[], serverId?: string) =>
			deleteManyMutation.mutateAsync({ bookIds, serverId }),
		deleteAllDownloads: deleteAllDownloadsMutation.mutateAsync,
		deleteServerDownloads: deleteServerDownloadsMutation.mutateAsync,
		markAsComplete,
		clearProgress,
		isDownloading: Boolean(queueCounts.pending + queueCounts.downloading > 0),
		isDeleting: deleteMutation.isPending,
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
