import * as Sentry from '@sentry/react-native'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'
import { toast } from 'sonner-native'

import { executePullAnnotationsSync } from '~/backgroundTasks/pullServerAnnotations'
import { executePushAnnotationsSync } from '~/backgroundTasks/pushLocalAnnotations'
import { useActiveServer } from '~/components/activeServer'
import { annotations, db, downloadedFiles, syncStatus } from '~/db'
import { isLocalLibrary } from '~/lib/localLibrary'
import { ReadiumLocator } from '~/modules/readium'

import { PushSyncParams, SyncParams } from './types'
import { useServerInstances } from './utils'

export function useAnnotationSync() {
	const { getInstances } = useServerInstances()

	const pushAnnotations = useCallback(
		async ({ forServers, ignoreBookIds, instances }: PushSyncParams = {}) => {
			const resolvedInstances = instances ?? (await getInstances(forServers))
			return executePushAnnotationsSync(resolvedInstances, ignoreBookIds)
		},
		[getInstances],
	)

	const pullAnnotations = useCallback(
		async ({ forServers, instances }: SyncParams) => {
			const resolvedInstances = instances ?? (await getInstances(forServers))
			return executePullAnnotationsSync(resolvedInstances)
		},
		[getInstances],
	)

	const syncAnnotations = useCallback(
		async ({ forServers, instances }: SyncParams) => {
			const resolvedInstances = instances ?? (await getInstances(forServers))

			const pullResults = await pullAnnotations({ forServers, instances: resolvedInstances })

			const ignoreBookIds = Object.values(pullResults).flatMap((r) => r.failedBookIds)

			const pushResults = await pushAnnotations({
				forServers,
				ignoreBookIds,
				instances: resolvedInstances,
			})

			if (ignoreBookIds.length > 0) {
				throw new Error(`Failed to pull annotations for ${ignoreBookIds.length} book(s)`)
			}

			return { pullResults, pushResults }
		},
		[getInstances, pullAnnotations, pushAnnotations],
	)

	return { syncAnnotations, pushAnnotations, pullAnnotations }
}

type AutoSyncParams = {
	enabled?: boolean
}

export function useAutoSyncAnnotationsForActiveServer({ enabled = true }: AutoSyncParams = {}) {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()

	const { syncAnnotations } = useAnnotationSync()

	const didSync = useRef(false)

	useFocusEffect(
		useCallback(() => {
			const syncIfNeeded = async () => {
				if (!enabled || didSync.current || isLocalLibrary(serverId)) return

				didSync.current = true

				try {
					await syncAnnotations({ forServers: [serverId] })
				} catch (error) {
					console.error('Failed to sync annotations', error)
					Sentry.captureException(error, {
						extra: { serverId },
					})
					toast.error('Failed to sync offline annotations', {
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

type SyncOnlineToOfflineAnnotationsParams = {
	bookId: string
	serverId: string
}

export function useSyncOnlineToOfflineAnnotations({
	bookId,
	serverId,
}: SyncOnlineToOfflineAnnotationsParams) {
	const {
		data: [downloadRecord],
	} = useLiveQuery(
		db.select().from(downloadedFiles).where(eq(downloadedFiles.id, bookId)).limit(1),
		[bookId],
	)

	const isOfflineSyncable = Boolean(downloadRecord)

	const syncCreate = useCallback(
		async (serverAnnotationId: string, locator: ReadiumLocator, annotationText?: string | null) => {
			if (!isOfflineSyncable) return

			try {
				const existing = await db
					.select()
					.from(annotations)
					.where(eq(annotations.serverAnnotationId, serverAnnotationId))
					.limit(1)

				if (existing.length > 0) {
					await db
						.update(annotations)
						.set({
							locator,
							annotationText,
							updatedAt: new Date(),
							syncStatus: syncStatus.enum.SYNCED,
						})
						.where(eq(annotations.serverAnnotationId, serverAnnotationId))
				} else {
					await db.insert(annotations).values({
						bookId,
						serverId,
						serverAnnotationId,
						locator,
						annotationText,
						createdAt: new Date(),
						updatedAt: new Date(),
						syncStatus: syncStatus.enum.SYNCED,
					})
				}
			} catch (error) {
				console.error('Failed to sync online annotation create to offline DB', { error })
				Sentry.captureException(error, { extra: { serverAnnotationId, bookId } })
			}
		},
		[bookId, serverId, isOfflineSyncable],
	)

	const syncUpdate = useCallback(
		async (serverAnnotationId: string, annotationText: string | null) => {
			if (!isOfflineSyncable) return

			try {
				await db
					.update(annotations)
					.set({
						annotationText,
						updatedAt: new Date(),
						syncStatus: syncStatus.enum.SYNCED,
					})
					.where(eq(annotations.serverAnnotationId, serverAnnotationId))
			} catch (error) {
				console.error('Failed to sync online annotation update to offline DB', { error })
				Sentry.captureException(error, { extra: { serverAnnotationId } })
			}
		},
		[isOfflineSyncable],
	)

	const syncDelete = useCallback(
		async (serverAnnotationId: string) => {
			if (!isOfflineSyncable) return

			try {
				await db.delete(annotations).where(eq(annotations.serverAnnotationId, serverAnnotationId))
			} catch (error) {
				console.error('Failed to sync online annotation delete to offline DB', { error })
				Sentry.captureException(error, { extra: { serverAnnotationId } })
			}
		},
		[isOfflineSyncable],
	)

	return { syncCreate, syncUpdate, syncDelete, isOfflineSyncable }
}
