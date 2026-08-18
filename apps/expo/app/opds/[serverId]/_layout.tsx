import { queryClient, SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, authDocument, OPDSAuthenticationDocument } from '@stump/sdk'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import OPDSAuthDialog from '~/components/opds/OPDSAuthDialog'
import { getOPDSInstance } from '~/lib/sdk/auth'
import { ActiveServerProvider, useActiveServer } from '~/providers/ActiveServerProvider'
import { OPDSFeedProvider } from '~/providers/OPDSFeedProvider'
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

function Screen() {
	const router = useRouter()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const { getServerConfig } = useSavedServers()
	const { activeServer } = useActiveServer()

	const cachedInstance = useRef(useCacheStore((state) => state.sdks[`${activeServer.id}-opds`]))
	const addInstanceToCache = useCacheStore((state) => state.addSDK)
	const removeInstanceFromCache = useCacheStore((state) => state.removeSDK)

	// eslint-disable-next-line react-hooks/refs
	const [sdk, setSDK] = useState<Api | null>(() => cachedInstance.current || null)
	const [pendingAuthDoc, setPendingAuthDoc] = useState<OPDSAuthenticationDocument | null>(null)

	useEffect(() => {
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
			removeInstanceFromCache(`${activeServer.id}-opds`)

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
		[activeServer.id, removeInstanceFromCache],
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
	)
}
