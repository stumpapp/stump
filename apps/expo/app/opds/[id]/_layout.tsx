import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, authDocument } from '@stump/sdk'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'

import { ActiveServerContext } from '~/components/activeServer'
import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { getOPDSInstance } from '~/lib/sdk/auth'
import { usePreferencesStore, useSavedServers } from '~/stores'

// TODO: Support cached instances like in /server/[id]/_layout.tsx
export default function Screen() {
	const router = useRouter()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const { savedServers, getServerConfig } = useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)

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
		}

		if (!sdk) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerConfig])

	const onAuthError = useCallback(
		async (_: string | undefined, data: unknown) => {
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
			const username = basic.labels?.login || 'Username'
			const password = basic.labels?.password || 'Password'

			// Replace the current screen with the auth screen, this was back is home
			router.replace({
				pathname: '/opds/[id]/auth',
				params: {
					id: activeServer?.id || '',
					logoURL,
					username,
					password,
				},
			})
		},
		[activeServer, router],
	)

	if (!activeServer) {
		// @ts-expect-error: Redirect works
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
					<Stack
						screenOptions={{ headerShown: false, animation: animationEnabled ? 'default' : 'none' }}
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
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
