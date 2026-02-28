import {
	queryClient,
	SDKContext,
	StumpClientContextProvider,
	useClientContext,
	useSDK,
} from '@stump/client'
import { Api, authDocument, OPDSAuthenticationDocument } from '@stump/sdk'
import { useQuery } from '@tanstack/react-query'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ActiveServerContext, useActiveServer } from '~/components/activeServer'
import OPDSAuthDialog from '~/components/opds/OPDSAuthDialog'
import { FullScreenLoader } from '~/components/ui'
import { feedHasSearch, getSearchURL, OPDSFeedContext } from '~/context/opds'
import { getOPDSInstance, isOPDSAuthError } from '~/lib/sdk/auth'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'

type OPDSFeedProviderProps = {
	children: React.ReactNode
	isAuthPending: boolean
}

function OPDSFeedProvider({ children, isAuthPending }: OPDSFeedProviderProps) {
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
		queryFn: () => {
			if (activeServer?.stumpOPDS) {
				return sdk.opds.catalog()
			} else {
				return sdk.opds.feed(activeServer?.url || '')
			}
		},
		enabled: !!activeServer && !isAuthPending,
		throwOnError: false,
	})

	useEffect(() => {
		if (!error || isAuthPending) return
		if (isOPDSAuthError(error)) {
			onUnauthenticatedResponse?.(undefined, error.response?.data)
		}
	}, [error, isAuthPending, onUnauthenticatedResponse])

	const feedContextValue = useMemo(
		() => ({
			catalog: catalog ?? null,
			searchURL: getSearchURL(catalog, sdk?.rootURL),
			hasSearch: feedHasSearch(catalog),
			isLoading: isCatalogLoading,
			error: error ?? null,
			refetch,
		}),
		[catalog, sdk?.rootURL, isCatalogLoading, error, refetch],
	)

	if (isCatalogLoading && !catalog) {
		return <FullScreenLoader label="Loading feed..." />
	}

	const isAuthError = isOPDSAuthError(error)

	if (isAuthError || isAuthPending) {
		return <FullScreenLoader label="Authenticating..." />
	}

	return <OPDSFeedContext.Provider value={feedContextValue}>{children}</OPDSFeedContext.Provider>
}

export default function Screen() {
	const router = useRouter()
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
	const [pendingAuthDoc, setPendingAuthDoc] = useState<OPDSAuthenticationDocument | null>(null)

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

	const onAuthError = useCallback(
		(_: string | undefined, data: unknown) => {
			removeInstanceFromCache(`${serverID}-opds`)

			const authDoc = authDocument.safeParse(data)
			if (!authDoc.success) {
				console.error('Failed to parse auth document', authDoc.error)
				return
			}

			const basic = authDoc.data.authentication.find(
				(doc) => doc.type === 'http://opds-spec.org/auth/basic',
			)
			if (!basic) {
				console.error('Only basic auth is supported')
				return
			}

			setPendingAuthDoc(authDoc.data)
		},
		[serverID, removeInstanceFromCache],
	)

	const handleAuthDialogClose = useCallback(
		(newSdk?: Api) => {
			if (newSdk && activeServer) {
				setSDK(newSdk)
				addInstanceToCache(`${activeServer.id}-opds`, newSdk)
				queryClient.clear()
				setPendingAuthDoc(null)
			} else {
				setPendingAuthDoc(null)
				router.dismissAll()
			}
		},
		[activeServer, addInstanceToCache, router],
	)

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
					<OPDSFeedProvider isAuthPending={!!pendingAuthDoc}>
						<Stack
							screenOptions={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
					</OPDSFeedProvider>

					<OPDSAuthDialog
						isOpen={!!pendingAuthDoc}
						authDoc={pendingAuthDoc}
						onClose={handleAuthDialogClose}
					/>
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
