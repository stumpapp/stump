import { and, eq, ne } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'

import { executeProgressSync } from '~/backgroundTasks/progressSync'
import { useActiveServer } from '~/components/activeServer'
import { db, readProgress, syncStatus } from '~/db'
import { useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'
import { SavedServerWithConfig } from '~/stores/savedServer'

import { getInstancesForServers } from '../sdk/auth'

export function useProgressSync() {
	const { savedServers, getServerConfig, saveServerToken, getServerToken } = useSavedServers()

	const onCacheInstance = useCacheStore((state) => state.addSDK)
	const getCachedInstance = useCacheStore((state) => (id: string) => state.sdks[id])

	const getFullServer = useCallback(
		async (serverId: string) => {
			const server = savedServers.find((s) => s.id === serverId)
			if (!server) return null
			const config = await getServerConfig(serverId)
			return { ...server, config } satisfies SavedServerWithConfig
		},
		[savedServers, getServerConfig],
	)

	const syncServerProgress = useCallback(
		async (serverId: string) => {
			const server = await getFullServer(serverId)
			if (!server) {
				throw new Error(`Server with ID ${serverId} not found`)
			}
		},
		[getFullServer],
	)

	const syncProgress = useCallback(
		async (forServers?: string[]) => {
			const servers = await Promise.all(
				savedServers
					.filter(
						(server) =>
							!forServers?.length || server.id === forServers.find((id) => id === server.id),
					)
					.map(async (server) => {
						const config = await getServerConfig(server.id)
						return { ...server, config } satisfies SavedServerWithConfig
					}),
			)

			const instances = await getInstancesForServers(servers, {
				getServerToken,
				saveToken: saveServerToken,
				getCachedInstance,
				onCacheInstance,
			})

			return executeProgressSync(instances)
		},
		[
			savedServers,
			getServerToken,
			saveServerToken,
			getServerConfig,
			onCacheInstance,
			getCachedInstance,
		],
	)

	return { syncProgress, syncServerProgress }
}

type UseProgressToSyncExistsParams = {
	serverId?: string
}

export function useProgressToSyncExists({ serverId }: UseProgressToSyncExistsParams = {}) {
	const { data } = useLiveQuery(
		db
			.select()
			.from(readProgress)
			.where(
				serverId
					? and(
							ne(readProgress.syncStatus, syncStatus.enum.SYNCED),
							eq(readProgress.serverId, serverId),
						)
					: ne(readProgress.syncStatus, syncStatus.enum.SYNCED),
			)
			.limit(1),
	)

	return data?.length > 0
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

	const isUnsyncedProgressExists = useProgressToSyncExists({ serverId })

	useFocusEffect(
		useCallback(() => {
			const syncIfNeeded = async () => {
				if (!enabled || !isUnsyncedProgressExists || didSync.current) return
				didSync.current = true
				await syncProgress([serverId])
			}
			syncIfNeeded()

			return () => {
				didSync.current = false
			}
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [enabled, serverId, isUnsyncedProgressExists]),
	)
}
