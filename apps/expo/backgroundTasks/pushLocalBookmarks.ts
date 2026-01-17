import * as Sentry from '@sentry/react-native'
import { graphql } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { and, eq, inArray, isNotNull, isNull, not } from 'drizzle-orm'
import { z } from 'zod'

import { bookmarkLocations, bookmarks, db, syncStatus } from '~/db'

type Bookmark = typeof bookmarks.$inferSelect
type SyncStatus = z.infer<typeof syncStatus>

const createMutation = graphql(`
	mutation PushCreateBookmark($input: BookmarkInput!) {
		createBookmark(input: $input) {
			id
		}
	}
`)

const deleteMutation = graphql(`
	mutation PushDeleteBookmark($id: String!) {
		deleteBookmark(id: $id) {
			id
		}
	}
`)

const fetchUnsyncedBookmarks = async (serverId: string) =>
	db
		.select()
		.from(bookmarks)
		.where(
			and(
				eq(bookmarks.serverId, serverId),
				not(inArray(bookmarks.syncStatus, [syncStatus.enum.SYNCED, syncStatus.enum.SYNCING])),
				isNull(bookmarks.deletedAt),
			),
		)
		.all()

const fetchDeletedBookmarks = async (serverId: string) =>
	db
		.select()
		.from(bookmarks)
		.where(
			and(
				eq(bookmarks.serverId, serverId),
				isNotNull(bookmarks.deletedAt),
				isNotNull(bookmarks.serverBookmarkId),
			),
		)
		.all()

const markSyncStatus = async (ids: number | number[], status: SyncStatus) => {
	const idArray = Array.isArray(ids) ? ids : [ids]
	if (idArray.length === 0) return
	await db.update(bookmarks).set({ syncStatus: status }).where(inArray(bookmarks.id, idArray)).run()
}

const handleCreateBookmark = async (api: Api, bookmark: Bookmark) => {
	if (bookmark.serverBookmarkId) return

	const locations = bookmarkLocations.safeParse(bookmark.locations)

	const result = await api.execute(createMutation, {
		input: {
			mediaId: bookmark.bookId,
			locator: {
				readium: {
					chapterTitle: bookmark.chapterTitle ?? undefined,
					href: bookmark.href,
					locations: locations.success ? locations.data : undefined,
					type: 'application/xhtml+xml',
				},
			},
			previewContent: bookmark.previewContent ?? undefined,
		},
	})

	await db
		.update(bookmarks)
		.set({ serverBookmarkId: result.createBookmark.id })
		.where(eq(bookmarks.id, bookmark.id))
		.run()
}

const handleDeleteBookmark = async (api: Api, bookmark: Bookmark) => {
	await api.execute(deleteMutation, {
		id: bookmark.serverBookmarkId!,
	})

	await db.delete(bookmarks).where(eq(bookmarks.id, bookmark.id)).run()
}

export const executeSingleServerBookmarkPushSync = async (
	serverId: string,
	api: Api,
	ignoreBookIds?: string[],
) => {
	const allUnsynced = await fetchUnsyncedBookmarks(serverId)
	const allDeleted = await fetchDeletedBookmarks(serverId)

	const filterIgnored = <T extends { bookId: string }>(items: T[]) =>
		ignoreBookIds?.length ? items.filter((b) => !ignoreBookIds.includes(b.bookId)) : items

	const unsyncedBookmarks = filterIgnored(allUnsynced)
	const deletedBookmarks = filterIgnored(allDeleted)

	await markSyncStatus(
		unsyncedBookmarks.map((b) => b.id),
		syncStatus.enum.SYNCING,
	)

	for (const bookmark of unsyncedBookmarks) {
		try {
			await handleCreateBookmark(api, bookmark)
			await markSyncStatus(bookmark.id, syncStatus.enum.SYNCED)
		} catch (error) {
			console.error('Failed to push bookmark', { bookmarkId: bookmark.id, error })
			Sentry.captureException(error, { extra: { bookmarkId: bookmark.id } })
			await markSyncStatus(bookmark.id, syncStatus.enum.ERROR)
		}
	}

	for (const bookmark of deletedBookmarks) {
		try {
			await handleDeleteBookmark(api, bookmark)
		} catch (error) {
			console.error('Failed to delete bookmark on server', {
				bookmarkId: bookmark.id,
				error,
			})
			Sentry.captureException(error, { extra: { bookmarkId: bookmark.id } })
		}
	}
}

/**
 * Push local bookmarks to multiple servers at once
 */
export const executePushBookmarksSync = async (
	instances: Record<string, Api>,
	ignoreBookIds?: string[],
): Promise<void> => {
	await Promise.all(
		Object.entries(instances).map(([serverId, api]) =>
			executeSingleServerBookmarkPushSync(serverId, api, ignoreBookIds),
		),
	)
}
