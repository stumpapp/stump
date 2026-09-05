import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api } from '@stump/sdk'
import { Redirect, Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ServerErrorBoundary } from '~/components/error'
import { FileExplorerAssetsProvider } from '~/components/fileExplorer'
import { getOPDSInstance } from '~/lib/sdk/auth'
import {
	ActiveServerProvider,
	useActiveServer,
	useUrlSwitch,
} from '~/providers/ActiveServerProvider'
import { OPDSLegacyFeedProvider } from '~/providers/OPDSLegacyFeedProvider'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'

export default function Wrapper() {
	const { savedServers } = useSavedServers()
	const { serverId } = useLocalSearchParams<{ serverId: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverId),
		[serverId, savedServers],
	)

	if (!activeServer) {
		throw new Error('No active server found. This should never happen.')
	}

	return (
		<ActiveServerProvider activeServer={activeServer}>
			<Screen />
		</ActiveServerProvider>
	)
}

// TODO(opds): The general look-and-feel for the v1.2 OPDS flow is heavily inspired by how I remember Panels being.
// I think the really simplistic approach lends itself well to the more simplistic nature of v1.2. I don't think
// I want to take these patterns (e.g., the file-based icons for non-publications, simple grids everywhere, etc)
// to the OPDS v2 flow, but I don't think this one kinda just looks and feels better? It's like using one of those
// minimal smart phones where theres just a few buttons for the essentials etc. Definitely something to revisit
// for the v2 flow, as I think that can be much prettier than it currently is
function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const { getServerConfig } = useSavedServers()
	const { activeServer, effectiveServerUrl } = useActiveServer()

	const cachedInstance = useRef(useCacheStore((state) => state.sdks[`${activeServer.id}-opds`]))
	const addInstanceToCache = useCacheStore((state) => state.addSDK)
	const removeInstanceFromCache = useCacheStore((state) => state.removeSDK)

	// eslint-disable-next-line react-hooks/refs
	const [sdk, setSDK] = useState<Api | null>(() => cachedInstance.current || null)

	useUrlSwitch({ url: effectiveServerUrl, setSDK })

	useEffect(() => {
		const configureSDK = async () => {
			const { id, kind } = activeServer

			const config = await getServerConfig(id)
			const instance = await getOPDSInstance({
				config,
				serverKind: kind,
				url: effectiveServerUrl,
			})
			setSDK(instance)
			addInstanceToCache(`${id}-opds`, instance)
		}

		if (!sdk) {
			configureSDK()
		}
	}, [activeServer, effectiveServerUrl, sdk, getServerConfig, addInstanceToCache])

	const onAuthError = useCallback(() => {
		removeInstanceFromCache(`${activeServer.id}-opds`)
		throw new Error('This OPDS server requires authentication')
	}, [activeServer.id, removeInstanceFromCache])

	if (!activeServer) {
		// @ts-expect-error: It's fine
		return <Redirect href="/" />
	}

	if (!sdk) {
		return null
	}

	return (
		<FileExplorerAssetsProvider>
			<StumpClientContextProvider onUnauthenticatedResponse={onAuthError}>
				<SDKContext.Provider value={{ sdk, setSDK }}>
					<OPDSLegacyFeedProvider>
						<Stack
							screenOptions={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
					</OPDSLegacyFeedProvider>
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</FileExplorerAssetsProvider>
	)
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	return <ServerErrorBoundary error={error} onRetry={() => retry()} />
}
