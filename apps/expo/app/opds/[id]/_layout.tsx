import { SDKContext, StumpClientContextProvider, useSDK } from '@stump/client'
import { Api, authDocument, resolveUrl } from '@stump/sdk'
import { useQuery } from '@tanstack/react-query'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { ActiveServerContext, useActiveServer } from '~/components/activeServer'
import ChevronBackLink from '~/components/ChevronBackLink'
import { FullScreenLoader } from '~/components/ui'
import { feedHasSearch, getSearchURL, OPDSFeedContext } from '~/context/opds'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { getOPDSInstance } from '~/lib/sdk/auth'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'

function OPDSFeedProvider({ children }: { children: React.ReactNode }) {
	const { sdk } = useSDK()
	const { activeServer } = useActiveServer()

	const { data: catalog, isLoading: isCatalogLoading } = useQuery({
		queryKey: [sdk.opds.keys.catalog, activeServer?.id],
		queryFn: () => {
			if (activeServer?.stumpOPDS) {
				return sdk.opds.catalog()
			} else {
				return sdk.opds.feed(activeServer?.url || '')
			}
		},
		enabled: !!activeServer,
	})

	const feedContextValue = useMemo(
		() => ({
			catalog: catalog ?? null,
			searchURL: getSearchURL(catalog, sdk?.rootURL),
			hasSearch: feedHasSearch(catalog),
			isLoading: isCatalogLoading,
		}),
		[catalog, sdk?.rootURL, isCatalogLoading],
	)

	if (isCatalogLoading && !catalog) {
		return <FullScreenLoader label="Loading feed..." />
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
	const cacheStore = useCacheStore((state) => ({
		addInstanceToCache: state.addSDK,
		removeInstanceFromCache: state.removeSDK,
	}))

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
			cacheStore.addInstanceToCache(`${id}-opds`, instance)
		}

		if (!sdk) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerConfig, cacheStore])

	const onAuthError = useCallback(
		async (_: string | undefined, data: unknown) => {
			cacheStore.removeInstanceFromCache(`${serverID}-opds`)

			const authDoc = authDocument.safeParse(data)
			if (!authDoc.success) {
				throw new Error('Failed to parse auth document', authDoc.error)
			}

			const basic = authDoc.data.authentication.find(
				(doc) => doc.type === 'http://opds-spec.org/auth/basic',
			)
			if (!basic) {
				throw new Error('Only basic auth is supported')
			}

			const logoURL = authDoc.data.links.find((link) => link.rel === 'logo')?.href
			const resolvedLogoURL = logoURL
				? resolveUrl(logoURL, sdk?.rootURL ?? activeServer?.url)
				: undefined
			const username = basic.labels?.login || 'Username'
			const password = basic.labels?.password || 'Password'

			// Replace the current screen with the auth screen, this was back is home
			router.replace({
				pathname: '/opds/[id]/auth',
				params: {
					id: activeServer?.id || '',
					logoURL: resolvedLogoURL,
					username,
					password,
				},
			})
		},
		[activeServer, router, serverID, cacheStore, sdk],
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
					<OPDSFeedProvider>
						<Stack
							screenOptions={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						>
							<Stack.Screen
								name="auth"
								options={{
									title: 'Login',
									headerShown: true,
									headerTransparent: Platform.OS === 'ios',
									headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
									animation: animationEnabled ? 'default' : 'none',
									presentation: IS_IOS_24_PLUS ? 'formSheet' : 'modal',
									sheetGrabberVisible: true,
									sheetAllowedDetents: [0.95],
									sheetInitialDetentIndex: 0,
									headerBackVisible: true,
									headerBackButtonDisplayMode: 'minimal',
									headerLeft: () =>
										Platform.select({
											ios: <ChevronBackLink icon={X} />,
											default: undefined,
										}),
								}}
							/>
						</Stack>
					</OPDSFeedProvider>
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
