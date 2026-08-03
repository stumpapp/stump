// TODO(widgets): there will be a lot of shared logic between platforms once android is supported,
// but for now it lives in ios file

import * as Sentry from '@sentry/react-native'
import { parseGraphQLDecimal } from '@stump/client'
import { Api } from '@stump/sdk'
import { formatDistanceToNow } from 'date-fns'
import { Directory, File } from 'expo-file-system'
import { MMKV } from 'react-native-mmkv'
import { z } from 'zod'

import {
	bookThumbnailPath,
	toAbsolutePath,
	widgetAssetsDirectory,
	widgetThumbnailDirectory,
	widgetThumbnailPath,
} from '~/lib/filesystem'
import ReadingNowWidget from '~/widgets/ReadingNowWidget.ios'
import type { ReadingNowWidgetProps, WidgetBook } from '~/widgets/types'

import { createThumbnail } from '../utils'

export type ServerBookInput = {
	id: string
	serverId: string
	name: string
	thumbnailUrl: string
	percentageCompleted: string | null
	updatedAt: string | null
	isReadingOffline: boolean
}

const SNAPSHOT_KEY = 'reading-now-snapshot'
const THUMBNAIL_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

const THUMBNAIL_META_KEY_PREFIX = 'thumb-meta-'

const storage = new MMKV({ id: 'stump-widget-sync' })

const thumbnailKey = (bookId: string) => THUMBNAIL_META_KEY_PREFIX + bookId

// doesn't really need to be an obj but think it is more future proof
const metaSchema = z.object({
	fetchedAt: z.number(),
})

function getBookThumbnailMeta(bookId: string): z.infer<typeof metaSchema> | null {
	const parsed = metaSchema.safeParse(JSON.parse(storage.getString(thumbnailKey(bookId)) || '{}'))
	if (!parsed.success) {
		return null
	}
	return parsed.data
}

async function ensureThumbnailCached(
	book: ServerBookInput,
	api: Api | null,
): Promise<string | null> {
	const destFile = new File(widgetThumbnailPath(book.id))
	try {
		// we might have a thumb if e.g. the book is downloaded, and if so just use that
		// instead of redownloading it
		const localPath = toAbsolutePath(bookThumbnailPath(book.serverId, book.id))
		const localFile = new File(localPath)
		if (localFile.exists) {
			if (!destFile.exists) {
				const resized = await createThumbnail(localFile.uri)
				await new File(resized.uri).copy(destFile)
			}
			// we skip the staleness check because the local thumb isn't mutable atm,
			// and if i ever add e.g. a regenerate thumb operation it would be
			// handled there
			return destFile.uri
		}

		const thumbMeta = getBookThumbnailMeta(book.id)
		if (thumbMeta) {
			const isStale = Date.now() - thumbMeta.fetchedAt > THUMBNAIL_MAX_AGE_MS
			if (destFile.exists && !isStale) {
				return destFile.uri
			}
		}

		if (!api) {
			// no api = local reading, so if no thumb we can't do anything
			return destFile.exists ? destFile.uri : null
		}

		const tmp = await File.downloadFileAsync(book.thumbnailUrl, destFile, {
			headers: await api.getHeaders(),
			idempotent: true,
		})
		if (tmp.size === 0) {
			tmp.delete()
			return null
		}
		const resized = await createThumbnail(tmp.uri)
		await new File(resized.uri).copy(destFile, { overwrite: true })
		storage.set('thumb-meta-' + book.id, JSON.stringify({ fetchedAt: Date.now() }))
		return destFile.uri
	} catch (err) {
		console.error('failed to download thumbnail for book', book, err)
		Sentry.captureException(err, {
			extra: {
				bookId: book.id,
				bookName: book.name,
				thumbnailUrl: book.thumbnailUrl,
			},
		})
		return destFile.exists ? destFile.uri : null
	}
}

function toPartialWidgetBook(book: ServerBookInput): WidgetBook {
	const percentage = parseGraphQLDecimal(book.percentageCompleted) ?? 0
	const lastReadAt = book.updatedAt ? new Date(book.updatedAt).getTime() : 0
	const timeAgoLabel = book.updatedAt
		? formatDistanceToNow(lastReadAt, { addSuffix: true })
		: 'never'

	return {
		id: book.id,
		serverId: book.serverId,
		name: book.name,
		percentage,
		lastReadAt,
		timeAgoLabel,
		isReadingOffline: book.isReadingOffline,
		// thumbnailPath is resolved after reconciling with existing thumbs, so we don't set it here
	}
}

/**
 * reconcile the incoming books with the cached snapshot to ensure that we don't lose any
 * books that are still relevant (e.g., not part of current sync but still within cutoff)
 */
function reconcileSnapshotWithBooks(incoming: WidgetBook[]): WidgetBook[] {
	const cached = getSnapshotFromCache()?.books ?? []
	if (!cached.length) return incoming

	const incomingIds = new Set(incoming.map((b) => b.id))
	const cachedOnly = cached.filter((b) => !incomingIds.has(b.id))
	return [...incoming, ...cachedOnly]
}

/**
 * reconciles the books which are currently being read with existing thumbnails
 * in the widget directory, removing any that are no longer needed so we don't
 * accumulate stale thumbs over time. books outside the incoming set but still
 * within the cutoff are preserved via topIds
 */
async function reconcileThumbnails(
	incomingBooks: ServerBookInput[],
	topIds: Set<string>,
	api: Api | null,
): Promise<Map<string, string>> {
	new Directory(widgetThumbnailDirectory.uri).create({ intermediates: true, idempotent: true })

	const existing = new Directory(widgetThumbnailDirectory.uri).list()
	for (const entry of existing) {
		if (!(entry instanceof File)) continue
		const bookId = entry.name.replace(/\.jpg$/, '')
		if (!topIds.has(bookId)) {
			entry.delete()
			storage.delete(thumbnailKey(bookId))
		}
	}

	const resultMap = new Map<string, string>()
	await Promise.all(
		incomingBooks.map(async (book) => {
			const path = await ensureThumbnailCached(book, api)
			if (path) {
				resultMap.set(book.id, path)
			}
		}),
	)
	return resultMap
}

function getSnapshotFromCache(): ReadingNowWidgetProps | null {
	const raw = storage.getString(SNAPSHOT_KEY)
	if (!raw) return null
	try {
		return JSON.parse(raw)
	} catch (err) {
		Sentry.captureException(err, {
			extra: {
				raw,
			},
		})
		return null
	}
}

export async function refreshReadingNowWidget(
	serverBooks: ServerBookInput[],
	api: Api | null,
	params: Pick<ReadingNowWidgetProps, 'thumbnailRatio' | 'accentColor'>,
): Promise<void> {
	const incomingById = new Map(serverBooks.map((b) => [b.id, b]))

	const mostRecent = reconcileSnapshotWithBooks(serverBooks.map(toPartialWidgetBook))
		.sort((a, b) => b.lastReadAt - a.lastReadAt)
		.slice(0, 5)

	const incomingBooks = mostRecent
		.filter((b) => incomingById.has(b.id))
		.map((b) => incomingById.get(b.id)!) // bang is fineee
	const topIds = new Set(mostRecent.map((b) => b.id))
	const thumbnailMap = await reconcileThumbnails(incomingBooks, topIds, api)

	const books: WidgetBook[] = mostRecent.map((book) => ({
		...book,
		thumbnailPath: book.thumbnailPath ?? thumbnailMap.get(book.id),
	}))

	const snapshot: ReadingNowWidgetProps = {
		books,
		...params,
		assetsPath: widgetAssetsDirectory.uri,
	}
	storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot))

	try {
		ReadingNowWidget.updateSnapshot(snapshot)
	} catch (err) {
		Sentry.captureException(err, {
			extra: {
				snapshot,
				serverBooks,
			},
		})
	}
}

export function refreshWidgetFromCache(): void {
	const snapshot = getSnapshotFromCache()
	if (snapshot) {
		ReadingNowWidget.updateSnapshot(snapshot)
	}
}
