import {
	queryClient,
	SDKContext,
	StumpClientContextProvider,
	useClientContext,
	useSDK,
} from '@stump/client'
import { Api } from '@stump/sdk'
import { useQuery } from '@tanstack/react-query'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ActiveServerContext, useActiveServer } from '~/components/activeServer'
import { FullScreenLoader } from '~/components/ui'
import {
	feedLegacyHasSearch,
	getLegacySearchURL,
	OPDSLegacyFeedContext,
} from '~/context/opdsLegacy'
import { getOPDSInstance, isOPDSAuthError } from '~/lib/sdk/auth'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'

type OPDSFeedProviderProps = {
	children: React.ReactNode
}

function OPDSFeedProvider({ children }: OPDSFeedProviderProps) {
	const { sdk } = useSDK()
	const { activeServer } = useActiveServer()
	const { onUnauthenticatedResponse } = useClientContext()

	const {
		data: catalog,
		isLoading: isCatalogLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: [sdk.opds.keys.catalog, activeServer?.id],
		queryFn: () => sdk.opdsLegacy.feed(activeServer?.url || ''),
		enabled: !!activeServer,
		throwOnError: false,
	})

	useEffect(() => {
		if (!error) return
		if (isOPDSAuthError(error)) {
			onUnauthenticatedResponse?.(undefined, error.response?.data)
		}
	}, [error, onUnauthenticatedResponse])

	const feedContextValue = useMemo(
		() => ({
			catalog: catalog ?? null,
			searchURL: getLegacySearchURL(catalog, sdk?.rootURL),
			hasSearch: feedLegacyHasSearch(catalog),
			isLoading: isCatalogLoading,
			error: error ?? null,
			refetch,
		}),
		[catalog, sdk?.rootURL, isCatalogLoading, error, refetch],
	)
	console.log('OPDSFeedProvider render', {
		feedContextValue,
	})

	if (isCatalogLoading && !catalog) {
		return <FullScreenLoader label="Loading feed..." />
	}

	return (
		<OPDSLegacyFeedContext.Provider value={feedContextValue}>
			{children}
		</OPDSLegacyFeedContext.Provider>
	)
}

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const { savedServers, getServerConfig } = useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const cachedInstance = useRef(useCacheStore((state) => state.sdks[`${serverID}-opds`]))
	const addInstanceToCache = useCacheStore((state) => state.addSDK)
	const removeInstanceFromCache = useCacheStore((state) => state.removeSDK)

	// eslint-disable-next-line react-hooks/refs
	const [sdk, setSDK] = useState<Api | null>(() => cachedInstance.current || null)

	useEffect(() => {
		if (!activeServer) return

		const configureSDK = async () => {
			const { id, url, kind } = activeServer

			const config = await getServerConfig(id)
			const instance = await getOPDSInstance({
				config,
				serverKind: kind,
				url,
			})
			setSDK(instance)
			addInstanceToCache(`${id}-opds`, instance)
		}

		if (!sdk) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerConfig, addInstanceToCache])

	const onAuthError = useCallback(() => {
		removeInstanceFromCache(`${serverID}-opds`)
		// TODO: Better handling here
		throw new Error('OPDS Authentication required')
	}, [serverID, removeInstanceFromCache])

	if (!activeServer) {
		// @ts-expect-error: It's fine
		return <Redirect href="/" />
	}

	if (!sdk) {
		return null
	}

	return (
		<ActiveServerContext.Provider
			value={{
				activeServer: activeServer,
			}}
		>
			<StumpClientContextProvider onUnauthenticatedResponse={onAuthError}>
				<SDKContext.Provider value={{ sdk, setSDK }}>
					<OPDSFeedProvider>
						<Stack
							screenOptions={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
					</OPDSFeedProvider>
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
