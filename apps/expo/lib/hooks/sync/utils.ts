import { useCallback } from 'react'

import { isLocalLibrary } from '~/lib/localLibrary'
import { useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'
import { SavedServerWithConfig } from '~/stores/savedServer'

import { getInstancesForServers } from '../../sdk/auth'

export function useServerInstances() {
	const { savedServers, getServerConfig, saveServerToken, getServerToken } = useSavedServers()

	const onCacheInstance = useCacheStore((state) => state.addSDK)
	const getCachedInstance = useCacheStore((state) => (id: string) => state.sdks[id])

	const getFullServer = useCallback(
		async (serverId: string) => {
			if (isLocalLibrary(serverId)) return null
			const server = savedServers.find((s) => s.id === serverId)
			if (!server) return null
			const config = await getServerConfig(serverId)
			return { ...server, config } satisfies SavedServerWithConfig
		},
		[savedServers, getServerConfig],
	)

	const getInstances = useCallback(
		async (forServers?: string[]) => {
			const actualServers = forServers?.filter((id) => !isLocalLibrary(id))

			const servers = await Promise.all(
				savedServers
					.filter(
						(server) =>
							!isLocalLibrary(server.id) &&
							(!actualServers?.length ||
								server.id === actualServers.find((id) => id === server.id)),
					)
					.map(async (server) => {
						const config = await getServerConfig(server.id)
						return { ...server, config } satisfies SavedServerWithConfig
					}),
			)

			return getInstancesForServers(servers, {
				getServerToken,
				saveToken: saveServerToken,
				getCachedInstance,
				onCacheInstance,
			})
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

	return { getInstances, getFullServer, savedServers }
}
