import * as Sentry from '@sentry/react-native'
import { graphql, PullServerBookmarksQuery } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { and, eq, inArray, isNull } from 'drizzle-orm'

import { bookmarkLocations, bookmarks, db, downloadedFiles, syncStatus } from '~/db'

const query = graphql(`
	query PullServerBookmarks($id: ID!) {
		bookmarksByMediaId(id: $id) {
			id
			epubcfi
			mediaId
			previewContent
			locator {
				chapterTitle
				href
				locations {
					fragments
					progression
					position
					totalProgression
					cssSelector
					partialCfi
				}
			}
		}
	}
`)

type ServerBookmark = PullServerBookmarksQuery['bookmarksByMediaId'][number]

export type PullBookmarksSyncResult = {
	failedBookIds: string[]
}

const isSamePosition = (
	a: { href: string; locations?: { progression?: number | null } | null },
	b: { href: string; locations?: { progression?: number | null } | null },
): boolean => a.href === b.href && a.locations?.progression === b.locations?.progression

const findMatchingPosition = (
	serverBookmark: ServerBookmark,
	local: (typeof bookmarks.$inferSelect)[],
): typeof bookmarks.$inferSelect | null => {
	if (!serverBookmark.locator) return null

	const found = local.find((l) => {
		if (l.serverBookmarkId) return false // Already synced
		const localLocations = bookmarkLocations.safeParse(l.locations)
		return isSamePosition(
			{ href: l.href, locations: localLocations.success ? localLocations.data : null },
			{ href: serverBookmark.locator!.href, locations: serverBookmark.locator!.locations },
		)
	})

	return found || null
}

const handlePositionMatch = async (
	localMatch: typeof bookmarks.$inferSelect,
	serverBookmark: ServerBookmark,
) => {
	await db
		.update(bookmarks)
		.set({
			serverBookmarkId: serverBookmark.id,
			syncStatus: syncStatus.enum.SYNCED,
		})
		.where(eq(bookmarks.id, localMatch.id))
		.run()
}

const handleInsertServerBookmark = async (
	bookId: string,
	serverId: string,
	serverBookmark: ServerBookmark,
) => {
	await db
		.insert(bookmarks)
		.values({
			bookId,
			serverId,
			serverBookmarkId: serverBookmark.id,
			href: serverBookmark.locator?.href ?? '',
			chapterTitle: serverBookmark.locator?.chapterTitle,
			epubcfi: serverBookmark.epubcfi,
			locations: serverBookmark.locator?.locations,
			previewContent: serverBookmark.previewContent,
			syncStatus: syncStatus.enum.SYNCED,
		})
		.run()
}

export const executeSingleServerBookmarkPullSync = async (
	serverId: string,
	api: Api,
): Promise<PullBookmarksSyncResult> => {
	const downloadedBooks = await db
		.select({ id: downloadedFiles.id })
		.from(downloadedFiles)
		.where(eq(downloadedFiles.serverId, serverId))
		.all()

	if (downloadedBooks.length === 0) {
		return { failedBookIds: [] }
	}

	const failedBookIds: string[] = []

	for (const book of downloadedBooks) {
		try {
			const serverBookmarks = await api.execute(query, { id: book.id })

			const localBookmarks = await db
				.select()
				.from(bookmarks)
				.where(and(eq(bookmarks.bookId, book.id), isNull(bookmarks.deletedAt)))
				.all()

			const localByServerId = new Map(
				localBookmarks.filter((b) => b.serverBookmarkId).map((b) => [b.serverBookmarkId!, b]),
			)

			const serverIds = new Set(serverBookmarks.bookmarksByMediaId.map((b) => b.id))

			for (const serverBookmark of serverBookmarks.bookmarksByMediaId) {
				if (localByServerId.has(serverBookmark.id)) {
					continue // Nothing to do, already synced
				}

				const positionMatch = findMatchingPosition(serverBookmark, localBookmarks)
				if (positionMatch) {
					await handlePositionMatch(positionMatch, serverBookmark)
				} else {
					await handleInsertServerBookmark(book.id, serverId, serverBookmark)
				}
			}

			const toDelete = localBookmarks.filter(
				(local) => local.serverBookmarkId && !serverIds.has(local.serverBookmarkId),
			)

			if (toDelete.length > 0) {
				await db
					.delete(bookmarks)
					.where(
						inArray(
							bookmarks.id,
							toDelete.map((b) => b.id),
						),
					)
					.run()
			}
		} catch (error) {
			console.error('Failed to pull bookmarks for book', { bookId: book.id, error })
			Sentry.captureException(error, { extra: { bookId: book.id, serverId } })
			failedBookIds.push(book.id)
		}
	}

	return { failedBookIds }
}

/**
 * Pull bookmarks from multiple servers
 *
 * @param instances A map of serverId-to-SDK instance
 */
export const executePullBookmarksSync = async (
	instances: Record<string, Api>,
): Promise<Record<string, PullBookmarksSyncResult>> => {
	const results = await Promise.all(
		Object.entries(instances).map(async ([serverId, api]) => {
			const result = await executeSingleServerBookmarkPullSync(serverId, api)
			return [serverId, result] as const
		}),
	)

	return Object.fromEntries(results)
}
