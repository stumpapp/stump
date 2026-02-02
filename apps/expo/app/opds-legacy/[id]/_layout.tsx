import { SDKContext, StumpClientContextProvider, useClientContext, useSDK } from '@stump/client'
import { Api } from '@stump/sdk'
import { useQuery } from '@tanstack/react-query'
import { Redirect, Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ActiveServerContext, useActiveServer } from '~/components/activeServer'
import { ServerErrorBoundary } from '~/components/error'
import { FileExplorerAssetsProvider } from '~/components/fileExplorer'
import { FullScreenLoader } from '~/components/ui'
import {
	feedLegacyHasSearch,
	getLegacySearchDocumentURL,
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

	const searchDocumentURL = getLegacySearchDocumentURL(catalog, sdk?.rootURL)

	const { data: searchDocument } = useQuery({
		enabled: !!searchDocumentURL,
		queryKey: ['searchDocument', searchDocumentURL],
		queryFn: () => sdk.opdsLegacy.searchDocument(searchDocumentURL!),
	})

	useEffect(() => {
		if (!error) return
		if (isOPDSAuthError(error)) {
			onUnauthenticatedResponse?.(undefined, error.response?.data)
		} else if (error) {
			throw error
		}
	}, [error, onUnauthenticatedResponse])

	const feedContextValue = useMemo(
		() => ({
			catalogMeta: catalog
				? {
						id: catalog.id,
						url: activeServer?.url,
						title: catalog.title,
						author: catalog.author,
					}
				: null,
			searchDoc: searchDocument ?? null,
			hasSearch: feedLegacyHasSearch(catalog),
			isLoading: isCatalogLoading,
			error: error ?? null,
			refetch,
		}),
		[catalog, searchDocument, isCatalogLoading, error, refetch, activeServer?.url],
	)

	if (isCatalogLoading && !catalog) {
		return <FullScreenLoader label="Loading feed..." />
	}

	return (
		<OPDSLegacyFeedContext.Provider value={feedContextValue}>
			{children}
		</OPDSLegacyFeedContext.Provider>
	)
}

// TODO(opds): The general look-and-feel for the v1.2 OPDS flow is heavily inspired by how I remember Panels being.
// I think the really simplistic approach lends itself well to the more simplistic nature of v1.2. I don't think
// I want to take these patterns (e.g., the file-based icons for non-publications, simple grids everywhere, etc)
// to the OPDS v2 flow, but I don't think this one kinda just looks and feels better? It's like using one of those
// minimal smart phones where theres just a few buttons for the essentials etc. Definitely something to revisit
// for the v2 flow, as I think that can be much prettier than it currently is
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
		throw new Error('This OPDS server requires authentication')
	}, [serverID, removeInstanceFromCache])

	if (!activeServer) {
		// @ts-expect-error: It's fine
		return <Redirect href="/" />
	}

	if (!sdk) {
		return null
	}

	return (
		<FileExplorerAssetsProvider>
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
		</FileExplorerAssetsProvider>
	)
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	return <ServerErrorBoundary error={error} onRetry={() => retry()} />
}
