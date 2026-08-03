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
}

const SNAPSHOT_KEY = 'reading-now-snapshot'
const THUMBNAIL_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

const THUMBNAIL_META_KEY_PREFIX = 'thumb-meta-'

const storage = new MMKV({ id: 'stump-widget-sync' })

const thumbnailKey = (bookId: string) => THUMBNAIL_META_KEY_PREFIX + bookId

// TODO: can i assume jpg throughout? not sure how much it will matter? at least
// for now, swift Image(uiImage:) will ignore the ext but android might not

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

async function ensureThumbnailCached(book: ServerBookInput, api: Api): Promise<string | null> {
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

		// TODO: resize? -> https://docs.expo.dev/versions/latest/sdk/imagemanipulator/

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

/**
 * reconciles the books which are currently currently being read with existing
 * thumbnails in the widget directory, removing any that are no longer needed
 * so we don't accumulate stale thumbs over time
 */
async function reconcileThumbnails(
	books: ServerBookInput[],
	api: Api,
): Promise<Map<string, string>> {
	new Directory(widgetThumbnailDirectory.uri).create({ intermediates: true, idempotent: true })

	const existing = new Directory(widgetThumbnailDirectory.uri).list()
	const targetIds = new Set(books.map((b) => b.id))

	for (const entry of existing) {
		if (!(entry instanceof File)) continue
		const bookId = entry.name.replace(/\.jpg$/, '')
		// remove any thumbs that are no longer in the top 6
		if (!targetIds.has(bookId)) {
			entry.delete()
			storage.delete(thumbnailKey(bookId))
		}
	}

	const resultMap = new Map<string, string>()
	await Promise.all(
		books.map(async (book) => {
			const path = await ensureThumbnailCached(book, api)
			if (path) {
				resultMap.set(book.id, path)
			}
		}),
	)
	return resultMap
}

export async function refreshReadingNowWidget(
	serverBooks: ServerBookInput[],
	api: Api,
	params: Pick<ReadingNowWidgetProps, 'thumbnailRatio' | 'accentColor'>,
): Promise<void> {
	const top6 = serverBooks.slice(0, 6)
	const thumbnailMap = await reconcileThumbnails(top6, api)

	const books: WidgetBook[] = top6.map((book) => {
		const percentage = parseGraphQLDecimal(book.percentageCompleted) ?? 0
		const lastReadAt = book.updatedAt ? new Date(book.updatedAt).getTime() : Date.now()
		const timeAgoLabel = formatDistanceToNow(lastReadAt, { addSuffix: true })
		return {
			id: book.id,
			serverId: book.serverId,
			name: book.name,
			percentage,
			thumbnailPath: thumbnailMap.get(book.id),
			lastReadAt,
			timeAgoLabel,
		}
	})

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
	try {
		const raw = storage.getString(SNAPSHOT_KEY)
		if (!raw) return
		const parsed = JSON.parse(raw)
		ReadingNowWidget.updateSnapshot(parsed)
	} catch (err) {
		Sentry.captureException(err, {
			extra: {
				raw: storage.getString(SNAPSHOT_KEY),
			},
		})
	}
}
