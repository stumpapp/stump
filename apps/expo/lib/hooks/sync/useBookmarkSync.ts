import * as Sentry from '@sentry/react-native'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner-native'

import { executePullBookmarksSync } from '~/backgroundTasks/pullServerBookmarks'
import { executePushBookmarksSync } from '~/backgroundTasks/pushLocalBookmarks'
import { useActiveServer } from '~/components/activeServer'
import { bookmarks, db, downloadedFiles, syncStatus } from '~/db'
import { isLocalLibrary } from '~/lib/localLibrary'
import { ReadiumLocator } from '~/modules/readium'

import { useServerInstances } from './utils'

export function useBookmarkSync() {
	const { getInstances } = useServerInstances()

	type PushBookmarksParams = {
		forServers?: string[]
		ignoreBookIds?: string[]
	}

	const pushBookmarks = useCallback(
		async ({ forServers, ignoreBookIds }: PushBookmarksParams = {}) => {
			const instances = await getInstances(forServers)
			return executePushBookmarksSync(instances, ignoreBookIds)
		},
		[getInstances],
	)

	const pullBookmarks = useCallback(
		async (forServers?: string[]) => {
			const instances = await getInstances(forServers)
			return executePullBookmarksSync(instances)
		},
		[getInstances],
	)

	const syncBookmarks = useCallback(
		async (forServers?: string[]) => {
			const pullResults = await pullBookmarks(forServers)

			const ignoreBookIds = Object.values(pullResults).flatMap((r) => r.failedBookIds)

			const pushResults = await pushBookmarks({ forServers, ignoreBookIds })

			if (ignoreBookIds.length > 0) {
				throw new Error(`Failed to pull bookmarks for ${ignoreBookIds.length} book(s)`)
			}

			return { pullResults, pushResults }
		},
		[pullBookmarks, pushBookmarks],
	)

	return { syncBookmarks, pushBookmarks, pullBookmarks }
}

type AutoSyncParams = {
	enabled?: boolean
}

export function useAutoSyncBookmarksForActiveServer({ enabled = true }: AutoSyncParams = {}) {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()

	const { syncBookmarks } = useBookmarkSync()

	const didSync = useRef(false)

	useFocusEffect(
		useCallback(() => {
			const syncIfNeeded = async () => {
				if (!enabled || didSync.current || isLocalLibrary(serverId)) return

				didSync.current = true

				try {
					await syncBookmarks([serverId])
				} catch (error) {
					console.error('Failed to sync bookmarks', error)
					Sentry.captureException(error, {
						extra: { serverId },
					})
					toast.error('Failed to sync offline bookmarks', {
						description: error instanceof Error ? error.message : 'Unknown error',
					})
				}
			}
			syncIfNeeded()

			return () => {
				didSync.current = false
			}
			// eslint-disable-next-line react-compiler/react-compiler
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [enabled, serverId]),
	)
}

type SyncOnlineToOfflineParams = {
	bookId: string
	serverId: string
}

export function useSyncOnlineToOfflineBookmarks({ bookId, serverId }: SyncOnlineToOfflineParams) {
	const { data: downloadedFile } = useLiveQuery(
		db.select().from(downloadedFiles).where(eq(downloadedFiles.id, bookId)).limit(1),
		[bookId],
	)

	const isDownloaded = downloadedFile && downloadedFile.length > 0

	const syncCreate = useCallback(
		async (serverBookmarkId: string, locator: ReadiumLocator, previewContent?: string | null) => {
			if (!isDownloaded) return

			try {
				const existing = await db
					.select()
					.from(bookmarks)
					.where(eq(bookmarks.serverBookmarkId, serverBookmarkId))
					.limit(1)
					.all()

				if (existing.length > 0) return

				await db.insert(bookmarks).values({
					bookId,
					serverId,
					serverBookmarkId,
					href: locator.href,
					chapterTitle: locator.chapterTitle,
					epubcfi: locator.locations?.partialCfi,
					locations: locator.locations,
					previewContent,
					syncStatus: syncStatus.enum.SYNCED,
				})
			} catch (error) {
				console.error('Failed to sync bookmark to offline DB', error)
			}
		},
		[bookId, serverId, isDownloaded],
	)

	const syncDelete = useCallback(
		async (serverBookmarkId: string) => {
			if (!isDownloaded) return

			try {
				await db.delete(bookmarks).where(eq(bookmarks.serverBookmarkId, serverBookmarkId))
			} catch (error) {
				console.error('Failed to sync bookmark deletion to offline DB', error)
			}
		},
		[isDownloaded],
	)

	return { syncCreate, syncDelete }
}
