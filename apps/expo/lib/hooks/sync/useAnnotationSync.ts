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
import { ReadiumLocator } from '~/modules/readium'

import { useServerInstances } from './utils'

export function useAnnotationSync() {
	const { getInstances } = useServerInstances()

	type PushAnnotationsParams = {
		forServers?: string[]
		ignoreBookIds?: string[]
	}

	const pushAnnotations = useCallback(
		async ({ forServers, ignoreBookIds }: PushAnnotationsParams = {}) => {
			const instances = await getInstances(forServers)
			return executePushAnnotationsSync(instances, ignoreBookIds)
		},
		[getInstances],
	)

	const pullAnnotations = useCallback(
		async (forServers?: string[]) => {
			const instances = await getInstances(forServers)
			return executePullAnnotationsSync(instances)
		},
		[getInstances],
	)

	const syncAnnotations = useCallback(
		async (forServers?: string[]) => {
			const pullResults = await pullAnnotations(forServers)

			const ignoreBookIds = Object.values(pullResults).flatMap((r) => r.failedBookIds)

			const pushResults = await pushAnnotations({ forServers, ignoreBookIds })

			if (ignoreBookIds.length > 0) {
				throw new Error(`Failed to pull annotations for ${ignoreBookIds.length} book(s)`)
			}

			return { pullResults, pushResults }
		},
		[pullAnnotations, pushAnnotations],
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
				if (!enabled || didSync.current) return

				didSync.current = true

				try {
					await syncAnnotations([serverId])
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
						.run()
				} else {
					await db
						.insert(annotations)
						.values({
							bookId,
							serverId,
							serverAnnotationId,
							locator,
							annotationText,
							createdAt: new Date(),
							updatedAt: new Date(),
							syncStatus: syncStatus.enum.SYNCED,
						})
						.run()
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
					.run()
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
				await db
					.delete(annotations)
					.where(eq(annotations.serverAnnotationId, serverAnnotationId))
					.run()
			} catch (error) {
				console.error('Failed to sync online annotation delete to offline DB', { error })
				Sentry.captureException(error, { extra: { serverAnnotationId } })
			}
		},
		[isOfflineSyncable],
	)

	return { syncCreate, syncUpdate, syncDelete, isOfflineSyncable }
}
