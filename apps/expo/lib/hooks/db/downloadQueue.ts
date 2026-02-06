import { useSDKSafe } from '@stump/client'
import { ImageMetadata, MediaMetadata, ReadiumLocator } from '@stump/graphql'
import { OPDSPublication, resolveUrl } from '@stump/sdk'
import { count, eq, not } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useActiveServerSafe } from '~/components/activeServer'
import { extensionFromMime, getAcquisitionLink, getPublicationId } from '~/components/opds/utils'
import { db } from '~/db'
import { downloadQueue, downloadQueueStatus } from '~/db/schema'
import {
	type DownloadProgress,
	type DownloadQueueEvent,
	type DownloadQueueMetadata,
	getDownloadQueueManager,
} from '~/lib/downloadQueue'

const downloadQueueKeys = {
	all: ['download-queue'] as const,
	list: () => [...downloadQueueKeys.all, 'list'] as const,
	counts: () => [...downloadQueueKeys.all, 'counts'] as const,
	item: (id: number) => [...downloadQueueKeys.all, 'item', id] as const,
}

export type EnqueueBookParams = {
	id: string
	url?: string | null // If not provided, will use SDK to generate it
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
	thumbnailMeta?: ImageMetadata | null
}

export type EnqueueOPDSParams = {
	id?: string
	publicationUrl: string
	publication: OPDSPublication
}

function useDownloadProgress() {
	const [progressMap, setProgressMap] = useState<Map<number, DownloadProgress>>(new Map())

	useEffect(() => {
		const manager = getDownloadQueueManager()

		setProgressMap(manager.getAllProgress())

		const unsubscribe = manager.subscribe((event: DownloadQueueEvent) => {
			if (event.type === 'progress') {
				setProgressMap((prev) => {
					const next = new Map(prev)
					next.set(event.queueId, event.progress)
					return next
				})
			} else if (
				event.type === 'completed' ||
				event.type === 'cancelled' ||
				event.type === 'failed'
			) {
				setProgressMap((prev) => {
					const next = new Map(prev)
					next.delete(event.queueId)
					return next
				})
			}
		})

		return unsubscribe
	}, [])

	return progressMap
}

type UseDownloadQueueParams = {
	serverId?: string
}

export function useDownloadQueue({ serverId }: UseDownloadQueueParams = {}) {
	const activeServerCtx = useActiveServerSafe()
	const effectiveServerId = serverId ?? activeServerCtx?.activeServer.id

	const sdkCtx = useSDKSafe()

	const { data: queueItems } = useLiveQuery(
		db
			.select()
			.from(downloadQueue)
			.where(not(eq(downloadQueue.status, downloadQueueStatus.enum.completed)))
			.orderBy(downloadQueue.createdAt),
	)

	const progressMap = useDownloadProgress()

	const counts = useMemo(() => {
		const items = queueItems ?? []
		return {
			pending: items.filter((i) => i.status === downloadQueueStatus.enum.pending).length,
			downloading: items.filter((i) => i.status === downloadQueueStatus.enum.downloading).length,
			failed: items.filter((i) => i.status === downloadQueueStatus.enum.failed).length,
			total: items.length,
		}
	}, [queueItems])

	const itemsWithProgress = useMemo(() => {
		return (queueItems ?? []).map((item) => ({
			...item,
			progress: progressMap.get(item.id) ?? null,
		}))
	}, [queueItems, progressMap])

	const pendingItems = useMemo(
		() => itemsWithProgress.filter((i) => i.status === downloadQueueStatus.enum.pending),
		[itemsWithProgress],
	)

	const activeItems = useMemo(
		() => itemsWithProgress.filter((i) => i.status === downloadQueueStatus.enum.downloading),
		[itemsWithProgress],
	)

	const failedItems = useMemo(
		() => itemsWithProgress.filter((i) => i.status === downloadQueueStatus.enum.failed),
		[itemsWithProgress],
	)

	const enqueueBook = useCallback(
		async (params: EnqueueBookParams) => {
			if (!effectiveServerId) {
				throw new Error('No active server available for downloads')
			}

			if (!sdkCtx?.sdk) {
				throw new Error('SDK is not initialized')
			}

			const { sdk } = sdkCtx

			const downloadUrl = params.url || sdk.media.downloadURL(params.id)
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
			return manager.enqueue({
				bookId: params.id,
				serverId: effectiveServerId,
				downloadUrl,
				filename,
				extension: params.extension,
				metadata,
			})
		},
		[effectiveServerId, sdkCtx],
	)

	const enqueueOPDSBook = useCallback(
		async (params: EnqueueOPDSParams) => {
			if (!effectiveServerId) {
				throw new Error('No active server available for downloads')
			}

			if (!sdkCtx?.sdk) {
				throw new Error('SDK is not initialized')
			}

			const { sdk } = sdkCtx
			const { publicationUrl, publication } = params
			const { metadata, links } = publication

			const bookId = params.id || getPublicationId(publicationUrl, metadata)
			const acquisitionLink = getAcquisitionLink(links)

			if (!acquisitionLink?.href) {
				throw new Error('No acquisition link found for this publication')
			}

			const extension = extensionFromMime(acquisitionLink.type)
			if (!extension) {
				throw new Error(`Unsupported file type: ${acquisitionLink.type || 'unknown'}`)
			}

			const downloadUrl = resolveUrl(acquisitionLink.href, sdk.rootURL)
			const filename = `${bookId}.${extension}`

			const queueMetadata: DownloadQueueMetadata = {
				bookName: metadata?.title,
				bookMetadata: {
					...metadata,
					title: metadata?.title,
					summary: metadata?.description || metadata?.summary,
				},
				isOPDS: true,
				publicationUrl,
			}

			const manager = getDownloadQueueManager()
			return manager.enqueue({
				bookId,
				serverId: effectiveServerId,
				downloadUrl,
				filename,
				extension,
				metadata: queueMetadata,
			})
		},
		[effectiveServerId, sdkCtx],
	)

	const cancel = useCallback(async (queueId: number) => {
		const manager = getDownloadQueueManager()
		await manager.cancel(queueId)
	}, [])

	const retry = useCallback(async (queueId: number) => {
		const manager = getDownloadQueueManager()
		await manager.retry(queueId)
	}, [])

	const dismiss = useCallback(async (queueId: number) => {
		const manager = getDownloadQueueManager()
		await manager.dismiss(queueId)
	}, [])

	const dismissAllFailed = useCallback(async () => {
		const manager = getDownloadQueueManager()
		for (const item of failedItems) {
			await manager.dismiss(item.id)
		}
	}, [failedItems])

	const retryAllFailed = useCallback(async () => {
		const manager = getDownloadQueueManager()
		for (const item of failedItems) {
			await manager.retry(item.id)
		}
	}, [failedItems])

	return {
		items: itemsWithProgress,
		pendingItems,
		activeItems,
		failedItems,
		counts,
		enqueueBook,
		enqueueOPDSBook,
		cancel,
		retry,
		dismiss,
		dismissAllFailed,
		retryAllFailed,
	}
}

export function useDownloadQueueCounts() {
	const { data: items } = useLiveQuery(
		db
			.select({ status: downloadQueue.status })
			.from(downloadQueue)
			.where(not(eq(downloadQueue.status, downloadQueueStatus.enum.completed))),
	)

	return useMemo(() => {
		const list = items ?? []
		return {
			pending: list.filter((i) => i.status === downloadQueueStatus.enum.pending).length,
			downloading: list.filter((i) => i.status === downloadQueueStatus.enum.downloading).length,
			failed: list.filter((i) => i.status === downloadQueueStatus.enum.failed).length,
			total: list.length,
			activeQueue: list.filter(
				(i) =>
					i.status === downloadQueueStatus.enum.pending ||
					i.status === downloadQueueStatus.enum.downloading,
			).length,
		}
	}, [items])
}

export function useFailedDownloadsCount() {
	const { data: [result] = [] } = useLiveQuery(
		db
			.select({ count: count() })
			.from(downloadQueue)
			.where(eq(downloadQueue.status, downloadQueueStatus.enum.failed)),
	)

	return result?.count ?? 0
}
