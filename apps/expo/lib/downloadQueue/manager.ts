import * as Sentry from '@sentry/react-native'
import { Api } from '@stump/sdk'
import { and, eq } from 'drizzle-orm'
import * as FileSystem from 'expo-file-system/legacy'

import { db, DownloadRepository } from '~/db'
import {
	downloadQueue,
	type DownloadQueueItem,
	downloadQueueMetadata,
	downloadQueueStatus,
} from '~/db/schema'
import { booksDirectory, ensureDirectoryExists } from '~/lib/filesystem'
import { useCacheStore } from '~/stores/cache'
import {
	getServerConfig,
	getServerToken,
	SavedServerWithConfig,
	saveServerToken,
	useSavedServerStore,
} from '~/stores/savedServer'

import { getInstanceForServer } from '../sdk/auth'
import {
	type DownloadProgress,
	type DownloadQueueEvent,
	type DownloadQueueEventListener,
	type EnqueueDownloadParams,
} from './types'
import { downloadMetaIntoDownloadRelations } from './utils'

const MAX_CONCURRENT_DOWNLOADS = 2

type ActiveDownload = {
	queueId: number
	bookId: string
	serverId: string
	resumable: FileSystem.DownloadResumable
	progress: DownloadProgress
}

// Note: If I need any other kind of queue/event-based system, it might be better
// to abstract this into a more generic manager later on like a QueueManager<T>. I don't think
// I'll need to but it should be the perfect base for it. I also did look at just offloading
// to something like rtk (via createListenerMiddleware) but honestly don't think it provided
// enough to warrant _another_ toolkit lib being added

/**
 * A class to manage concurrent downloads throughout the app
 */
class DownloadQueueManager {
	private static instance: DownloadQueueManager | null = null

	private activeDownloads: Map<number, ActiveDownload> = new Map()

	private listeners: Set<DownloadQueueEventListener> = new Set()

	/**
	 * A flag that indicates whether the queue is currently being processed, used
	 * to prevent concurrent processing loops
	 */
	private isProcessing = false

	static getInstance(): DownloadQueueManager {
		if (!DownloadQueueManager.instance) {
			DownloadQueueManager.instance = new DownloadQueueManager()
		}
		return DownloadQueueManager.instance
	}

	/**
	 * Add another listener for download queue events
	 *
	 * @param listener A callback that will fire when the manager emits events
	 */
	subscribe(listener: DownloadQueueEventListener): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	private emit(event: DownloadQueueEvent): void {
		this.listeners.forEach((listener) => listener(event))
	}

	private async getSDK(serverId: string): Promise<Api | null> {
		const cachedInstance = useCacheStore.getState().sdks[serverId]
		if (cachedInstance) {
			return cachedInstance
		}

		const serverBase = useSavedServerStore.getState().servers.find((s) => s.id === serverId)
		if (!serverBase) {
			return null
		}

		const savedServer = {
			...serverBase,
			config: await getServerConfig(serverId),
		} satisfies SavedServerWithConfig

		const instance = await getInstanceForServer(savedServer, {
			getServerToken,
			saveToken: saveServerToken,
			onCacheInstance: useCacheStore.getState().addSDK,
		})

		return instance
	}

	/**
	 * Enqueue a new download
	 *
	 * @returns The queue ID of the enqueued download, or -1 if already downloaded
	 */
	async enqueue(params: EnqueueDownloadParams): Promise<number> {
		const existingRecord = await db
			.select()
			.from(downloadQueue)
			.where(
				and(eq(downloadQueue.bookId, params.bookId), eq(downloadQueue.serverId, params.serverId)),
			)
			.get()

		if (existingRecord) {
			if (existingRecord.status === downloadQueueStatus.enum.failed) {
				await db
					.update(downloadQueue)
					.set({
						status: downloadQueueStatus.enum.pending,
						failureReason: null,
						downloadUrl: params.downloadUrl,
						metadata: params.metadata,
					})
					.where(eq(downloadQueue.id, existingRecord.id))

				this.emit({ type: 'queue-changed' })
				this.processQueue()
				return existingRecord.id
			}
			return existingRecord.id
		}

		const downloaded = await DownloadRepository.getFile(params.bookId, params.serverId)
		if (downloaded) {
			return -1 // No requeueing already downloaded
		}

		const result = await db
			.insert(downloadQueue)
			.values({
				bookId: params.bookId,
				serverId: params.serverId,
				status: downloadQueueStatus.enum.pending,
				downloadUrl: params.downloadUrl,
				filename: params.filename,
				extension: params.extension,
				metadata: params.metadata,
			})
			.returning({ id: downloadQueue.id })

		// Note: Shouldn't really happen. Might be worth log if folks have weird funky issues
		const queueId = result[0]?.id ?? -1

		this.emit({ type: 'queue-changed' })
		this.processQueue()

		return queueId
	}

	/**
	 * Cancel a download (removes from queue or aborts if active download)
	 */
	async cancel(queueId: number): Promise<void> {
		const active = this.activeDownloads.get(queueId)

		if (active) {
			try {
				await active.resumable.cancelAsync()
			} catch {
				// Ignore cancellation errors, might be irrelevant
			}
			this.activeDownloads.delete(queueId)
			this.emit({ type: 'cancelled', queueId, bookId: active.bookId })
		}

		const item = await db.select().from(downloadQueue).where(eq(downloadQueue.id, queueId)).get()

		if (item) {
			await db.delete(downloadQueue).where(eq(downloadQueue.id, queueId))
			this.emit({ type: 'queue-changed' })
		}

		this.processQueue()
	}

	/**
	 * Retry a failed download. This will not work for non-failure recoreds
	 */
	async retry(queueId: number): Promise<void> {
		await db
			.update(downloadQueue)
			.set({
				status: downloadQueueStatus.enum.pending,
				failureReason: null,
			})
			.where(
				and(
					eq(downloadQueue.id, queueId),
					eq(downloadQueue.status, downloadQueueStatus.enum.failed),
				),
			)
		this.emit({ type: 'queue-changed' })
		this.processQueue()
	}

	/**
	 * Dismiss a download (remove from queue without retrying)
	 */
	async dismiss(queueId: number): Promise<void> {
		await db.delete(downloadQueue).where(eq(downloadQueue.id, queueId))
		this.emit({ type: 'queue-changed' })
	}

	/**
	 * Download a file immediately without going through the queue. This is pretty much
	 * only used for readers which require immediately downloading books (e.g., ebooks) before
	 * the reader can render
	 *
	 * @returns The file uri
	 */
	async downloadImmediate(
		params: EnqueueDownloadParams,
		onProgress?: (progress: DownloadProgress) => void,
	): Promise<string> {
		const downloaded = await DownloadRepository.getFile(params.bookId, params.serverId)
		if (downloaded) {
			return `${booksDirectory(params.serverId)}/${downloaded.filename}`
		}

		const sdk = await this.getSDK(params.serverId)
		if (!sdk) {
			throw new Error('Server not connected. Please reconnect and try again.')
		}

		await ensureDirectoryExists(booksDirectory(params.serverId))

		const placementUrl = `${booksDirectory(params.serverId)}/${params.filename}`

		// TODO(filesystem): Use non-deprecated filesystem
		const progressCallback: FileSystem.DownloadProgressCallback = (progress) => {
			const downloadProgress: DownloadProgress = {
				totalBytes: progress.totalBytesExpectedToWrite,
				downloadedBytes: progress.totalBytesWritten,
				percentage:
					progress.totalBytesExpectedToWrite > 0
						? Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100)
						: 0,
			}
			onProgress?.(downloadProgress)
		}

		const resumable = FileSystem.createDownloadResumable(
			params.downloadUrl,
			placementUrl,
			{
				headers: sdk.headers,
			},
			progressCallback,
		)

		const result = await resumable.downloadAsync()

		if (!result) {
			throw new Error('Download was cancelled')
		}

		// TODO: This is fine for Stump, but will it hold true for all servers? I assume so.
		// I could always just assert > 2xx?
		if (result.status !== 200) {
			throw new Error(`Download failed with status ${result.status}`)
		}

		const size = Number(result.headers['Content-Length'] ?? 0)
		const metadata = params.metadata ? downloadQueueMetadata.safeParse(params.metadata).data : null

		await DownloadRepository.addFile(
			{
				id: params.bookId,
				filename: params.filename,
				uri: result.uri,
				serverId: params.serverId,
				size: !isNaN(size) && size > 0 ? size : undefined,
				bookName: metadata?.bookName,
				metadata: metadata?.bookMetadata,
				seriesId: metadata?.seriesId,
				toc: metadata?.toc,
				imageMetadata: metadata?.thumbnailMeta,
			},
			downloadMetaIntoDownloadRelations(metadata),
		)

		return result.uri
	}

	/**
	 * Get the current progression of a download item in the queue
	 */
	getProgress(queueId: number): DownloadProgress | null {
		return this.activeDownloads.get(queueId)?.progress ?? null
	}

	/**
	 * GGet all the current progressions of active downloads
	 */
	getAllProgress(): Map<number, DownloadProgress> {
		const result = new Map<number, DownloadProgress>()
		this.activeDownloads.forEach((download, queueId) => {
			result.set(queueId, download.progress)
		})
		return result
	}

	/**
	 * Initialize the manager, re-enqueuing any downloads that were in-progress
	 */
	async initialize(): Promise<void> {
		await db
			.update(downloadQueue)
			.set({ status: downloadQueueStatus.enum.pending })
			.where(eq(downloadQueue.status, downloadQueueStatus.enum.downloading))

		this.processQueue()
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing) return

		this.isProcessing = true

		try {
			while (this.activeDownloads.size < MAX_CONCURRENT_DOWNLOADS) {
				const nextItem = await db
					.select()
					.from(downloadQueue)
					.where(eq(downloadQueue.status, downloadQueueStatus.enum.pending))
					.orderBy(downloadQueue.createdAt)
					.limit(1)
					.get()

				if (!nextItem) break

				await this.startDownload(nextItem)
			}
		} finally {
			this.isProcessing = false
		}
	}

	private async startDownload(item: DownloadQueueItem): Promise<void> {
		const sdk = await this.getSDK(item.serverId)

		if (!sdk) {
			await this.markFailed(item.id, 'Server not connected. Please reconnect and retry.')
			return
		}

		try {
			await db
				.update(downloadQueue)
				.set({ status: downloadQueueStatus.enum.downloading })
				.where(eq(downloadQueue.id, item.id))

			this.emit({ type: 'started', queueId: item.id, bookId: item.bookId })
			this.emit({ type: 'queue-changed' })

			await ensureDirectoryExists(booksDirectory(item.serverId))

			const placementUrl = `${booksDirectory(item.serverId)}/${item.filename}`

			// TODO(filesystem): Use non-deprecated filesystem
			const progressCallback: FileSystem.DownloadProgressCallback = (progress) => {
				const downloadProgress: DownloadProgress = {
					totalBytes: progress.totalBytesExpectedToWrite,
					downloadedBytes: progress.totalBytesWritten,
					percentage:
						progress.totalBytesExpectedToWrite > 0
							? Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100)
							: 0,
				}

				const active = this.activeDownloads.get(item.id)
				if (active) {
					active.progress = downloadProgress
				}

				this.emit({
					type: 'progress',
					queueId: item.id,
					bookId: item.bookId,
					progress: downloadProgress,
				})
			}

			const resumable = FileSystem.createDownloadResumable(
				item.downloadUrl,
				placementUrl,
				{
					headers: sdk.headers,
				},
				progressCallback,
			)

			this.activeDownloads.set(item.id, {
				queueId: item.id,
				bookId: item.bookId,
				serverId: item.serverId,
				resumable,
				progress: { totalBytes: 0, downloadedBytes: 0, percentage: 0 },
			})

			const result = await resumable.downloadAsync()

			this.activeDownloads.delete(item.id)

			if (!result) {
				await this.markFailed(item.id, 'Download was cancelled')
				return
			}

			// TODO: This is fine for Stump, but will it hold true for all servers? I assume so.
			// I could always just assert > 2xx?
			if (result.status !== 200) {
				await this.markFailed(item.id, `Download failed with status ${result.status}`)
				return
			}

			await this.completeDownload(item, result)
		} catch (error) {
			this.activeDownloads.delete(item.id)

			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

			Sentry.withScope((scope) => {
				scope.setTag('action', 'queue download')
				scope.setExtra('bookID', item.bookId)
				scope.setExtra('serverId', item.serverId)
				Sentry.captureException(error)
			})

			await this.markFailed(item.id, errorMessage)
		}
	}

	private async markFailed(queueId: number, reason: string): Promise<void> {
		const item = await db.select().from(downloadQueue).where(eq(downloadQueue.id, queueId)).get()

		await db
			.update(downloadQueue)
			.set({
				status: downloadQueueStatus.enum.failed,
				failureReason: reason,
			})
			.where(eq(downloadQueue.id, queueId))

		if (item) {
			this.emit({ type: 'failed', queueId, bookId: item.bookId, error: reason })
		}
		this.emit({ type: 'queue-changed' })

		this.processQueue()
	}

	private async completeDownload(
		item: DownloadQueueItem,
		result: FileSystem.FileSystemDownloadResult,
	): Promise<void> {
		try {
			const size = Number(result.headers['Content-Length'] ?? 0)
			const metadata = item.metadata ? downloadQueueMetadata.safeParse(item.metadata).data : null

			await DownloadRepository.addFile(
				{
					id: item.bookId,
					filename: item.filename,
					uri: result.uri,
					serverId: item.serverId,
					size: !isNaN(size) && size > 0 ? size : undefined,
					bookName: metadata?.bookName,
					metadata: metadata?.bookMetadata,
					seriesId: metadata?.seriesId,
					toc: metadata?.toc,
					imageMetadata: metadata?.thumbnailMeta,
				},
				downloadMetaIntoDownloadRelations(metadata),
			)

			await db.delete(downloadQueue).where(eq(downloadQueue.id, item.id))

			this.emit({ type: 'completed', queueId: item.id, bookId: item.bookId })
			this.emit({ type: 'queue-changed' })
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to save download'

			Sentry.withScope((scope) => {
				scope.setTag('action', 'complete queue download')
				scope.setExtra('bookID', item.bookId)
				Sentry.captureException(error)
			})

			await this.markFailed(item.id, errorMessage)
			return
		}

		this.processQueue()
	}
}

export const getDownloadQueueManager = DownloadQueueManager.getInstance.bind(DownloadQueueManager)

export { DownloadQueueManager }
