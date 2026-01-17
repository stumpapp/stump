import * as Sentry from '@sentry/react-native'
import { MediaProgressInput } from '@stump/graphql'
import { and, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner-native'
import { match, P } from 'ts-pattern'

import { executePullProgressSync } from '~/backgroundTasks/pullServerProgress'
import { executePushProgressSync } from '~/backgroundTasks/pushLocalProgress'
import { useActiveServer } from '~/components/activeServer'
import { db, epubProgress, readProgress, syncStatus } from '~/db'

import { useServerInstances } from './utils'

export function useProgressSync() {
	const { getInstances, getFullServer } = useServerInstances()

	const syncServerProgress = useCallback(
		async (serverId: string) => {
			const server = await getFullServer(serverId)
			if (!server) {
				throw new Error(`Server with ID ${serverId} not found`)
			}
		},
		[getFullServer],
	)

	type PushProgressParams = {
		forServers?: string[]
		ignoreBookIds?: string[]
	}

	const pushProgress = useCallback(
		async ({ forServers, ignoreBookIds }: PushProgressParams = {}) => {
			const instances = await getInstances(forServers)
			return executePushProgressSync(instances, ignoreBookIds)
		},
		[getInstances],
	)

	const pullProgress = useCallback(
		async (forServers?: string[]) => {
			const instances = await getInstances(forServers)
			return executePullProgressSync(instances)
		},
		[getInstances],
	)

	const syncProgress = useCallback(
		async (forServers?: string[]) => {
			const pullResults = await pullProgress(forServers)

			const ignoreBookIds = Object.values(pullResults).flatMap((r) => r.failedBookIds)

			const pushResults = await pushProgress({ forServers, ignoreBookIds })

			if (ignoreBookIds.length > 0) {
				throw new Error(`Failed to pull progress for ${ignoreBookIds.length} book(s)`)
			}

			return { pullResults, pushResults }
		},
		[pullProgress, pushProgress],
	)

	return { syncProgress, syncServerProgress, pushProgress, pullProgress }
}

type Params = {
	enabled?: boolean
}

export function useAutoSyncActiveServer({ enabled = true }: Params = {}) {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()

	const { syncProgress } = useProgressSync()

	const didSync = useRef(false)

	useFocusEffect(
		useCallback(() => {
			const syncIfNeeded = async () => {
				if (!enabled || didSync.current) return

				didSync.current = true

				try {
					await syncProgress([serverId])
				} catch (error) {
					console.error('Failed to sync progress', error)
					Sentry.captureException(error, {
						extra: { serverId },
					})
					toast.error('Failed to sync offline progress', {
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

type SyncOnlineToOfflineProgressParams = {
	bookId: string
	serverId: string
}

export function useSyncOnlineToOfflineProgress({
	bookId,
	serverId,
}: SyncOnlineToOfflineProgressParams) {
	const {
		data: [record],
	} = useLiveQuery(
		db
			.select()
			.from(readProgress)
			.where(and(eq(readProgress.bookId, bookId), eq(readProgress.serverId, serverId)))
			.limit(1),
	)
	// If there's a record, then it's offline-syncable. We don't care about sync status here,
	// we will always write online progress to offline DB so, upon returing to offline, things are
	// up to date
	const isOfflineSyncable = Boolean(record)

	const syncProgress = useCallback(
		async (onlineProgress: MediaProgressInput) => {
			if (!isOfflineSyncable) return

			const values = match(onlineProgress)
				.with(
					{ epub: P.not(P.nullish) },
					({ epub: { percentage, elapsedSeconds, locator } }) =>
						({
							bookId,
							serverId,
							elapsedSeconds,
							percentage,
							epubProgress: epubProgress.safeParse(locator.readium).data,
							syncStatus: syncStatus.enum.SYNCED,
						}) satisfies typeof readProgress.$inferInsert,
				)
				.with(
					{ paged: P.not(P.nullish) },
					({ paged: { page, elapsedSeconds } }) =>
						({
							bookId,
							serverId,
							elapsedSeconds,
							page,
							syncStatus: syncStatus.enum.SYNCED,
						}) satisfies typeof readProgress.$inferInsert,
				)
				.otherwise(() => null)

			if (!values) {
				console.warn('Unexpected progression format when syncing online to offline', {
					onlineProgress,
				})
				Sentry.captureMessage('Unexpected `null` progression when syncing online to offline', {
					extra: { onlineProgress },
					level: 'warning',
				})
				return
			}

			// Note: I don't throw here because I intend for this to be a background best-effort sync
			try {
				await db
					.insert(readProgress)
					.values(values)
					.onConflictDoUpdate({
						target: readProgress.bookId,
						set: { ...values, lastModified: new Date() },
					})
					.run()
			} catch (error) {
				console.error('Failed to sync online progress to offline DB', {
					onlineProgress,
					values,
					error,
				})
				Sentry.captureException(error, {
					extra: { onlineProgress, values },
				})
			}
		},
		[bookId, serverId, isOfflineSyncable],
	)

	return { syncProgress }
}
