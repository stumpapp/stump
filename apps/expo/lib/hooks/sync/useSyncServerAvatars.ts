import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { executePullServerLogos } from '~/backgroundTasks/pullServerLogo'
import { SavedServer } from '~/stores/savedServer'

import { useServerInstances } from './utils'

export function useSyncServerAvatars() {
	const { savedServers, getFullServer, getInstances } = useServerInstances()

	const [autoSyncableServers, setAutoSyncableServers] = useState<Set<string>>(new Set())

	const serverIds = useMemo(() => savedServers.map(({ id }) => id), [savedServers])
	const serverIdsToServer = useMemo(
		() =>
			savedServers.reduce(
				(acc, curr) => ({
					...acc,
					[curr.id]: curr,
				}),
				{} as Record<string, SavedServer>,
			),
		[savedServers],
	)

	useEffect(() => {
		async function buildSyncableServers() {
			const fullServers = (await Promise.all(serverIds.map(getFullServer))).filter((s) => s != null)

			// if the server has an avatar set, we won't sync it until you re-enter server. i think this is fine,
			// most likely folks won't be updating avatars all the time and the extra pings are not overly
			// necessary imo
			setAutoSyncableServers(
				new Set(
					fullServers
						.filter(({ avatar, config }) => config?.auth != null && avatar == null)
						.map(({ id }) => id),
				),
			)
		}

		buildSyncableServers()
	}, [serverIds, getFullServer])

	const lastSyncedSet = useRef(new Set())

	const syncServerLogos = useCallback(
		async (ids: string[]) => {
			const instances = await getInstances(ids)
			const params = []
			for (const [serverId, instance] of Object.entries(instances)) {
				const server = serverIdsToServer[serverId]
				if (server) params.push({ server, api: instance })
			}
			await executePullServerLogos(params)
			lastSyncedSet.current = new Set([...lastSyncedSet.current, ...ids])
		},
		[getInstances, serverIdsToServer],
	)

	useEffect(() => {
		const unsyncedItems = autoSyncableServers.difference(lastSyncedSet.current)
		if (unsyncedItems.size) {
			console.log('syncing the following', Array.from(unsyncedItems))
			syncServerLogos(Array.from(unsyncedItems))
		} else {
			console.log('did not sync anything')
		}
	}, [autoSyncableServers, syncServerLogos])
}
