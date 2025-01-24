import FontAwesome from '@expo/vector-icons/FontAwesome'
import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, CreatedToken } from '@stump/sdk'
import { Redirect, Tabs, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { ActiveServerContext } from '~/components/activeServer'
import ServerAuthDialog from '~/components/ServerAuthDialog'
import { icons } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

const { Unplug } = icons

export default function TabLayout() {
	const router = useRouter()

	const { savedServers, getServerToken, saveServerToken } = useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

	useEffect(() => {
		// if (!activeServer) return

		const configureSDK = async () => {
			const { id, url } = activeServer || { id: 'dev', url: 'http://192.168.0.188:10801' }
			const existingToken = await getServerToken(id)
			const instance = new Api({ baseURL: url, authMethod: 'token' })
			if (!existingToken) {
				setIsAuthDialogOpen(true)
			} else {
				instance.token = existingToken.token
			}
			setSDK(instance)
		}

		if (!sdk && !isAuthDialogOpen) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerToken, isAuthDialogOpen])

	const handleAuthDialogClose = useCallback(
		(token?: CreatedToken) => {
			if (token) {
				const { access_token, expires_at } = token
				const instance = new Api({ baseURL: activeServer?.url || 'dev', authMethod: 'token' })
				instance.token = access_token
				setSDK(instance)
				saveServerToken(activeServer?.id || 'dev', {
					expiresAt: new Date(expires_at),
					token: access_token,
				})
				setIsAuthDialogOpen(false)
			} else {
				router.dismissAll()
			}
		},
		[activeServer, router, saveServerToken],
	)

	if (!activeServer) {
		// return <Redirect href="/" />
	}

	if (!sdk) {
		return null
	}

	// FIXME: flow is fucked. Currently user only being set in ServerAuthDialog,
	// but we need to set it when we already have a token

	return (
		<ActiveServerContext.Provider
			value={{
				activeServer: activeServer || {
					id: 'dev',
					url: 'http://192.168.0.188:10801',
					name: 'Dev',
					kind: 'stump',
				},
			}}
		>
			<StumpClientContextProvider
			// onUnauthenticatedResponse={handleUnauthenticatedResponse}
			// onConnectionWithServerChanged={handleConnectionWithServerChanged}
			// // TODO: persist token in AsyncStorage
			// onAuthenticated={() => {}}
			>
				<SDKContext.Provider value={{ sdk }}>
					<ServerAuthDialog isOpen={isAuthDialogOpen} onClose={handleAuthDialogClose} />
					{sdk.token && !isAuthDialogOpen && (
						<Tabs screenOptions={{ tabBarActiveTintColor: 'white' }}>
							<Tabs.Screen
								name="index"
								options={{
									title: 'Home',
									tabBarIcon: ({ color }) => <FontAwesome size={20} name="home" color={color} />,
									headerLeft: () => (
										<Pressable onPress={() => router.dismissAll()}>
											{({ pressed }) => (
												<View
													className={cn(
														'aspect-square flex-1 items-start justify-center pt-0.5',
														pressed && 'opacity-70',
													)}
												>
													<Unplug size={20} className="text-foreground-muted" />
												</View>
											)}
										</Pressable>
									),
								}}
							/>

							<Tabs.Screen
								name="browse"
								options={{
									headerShown: false,
									title: 'Browse',
									tabBarIcon: ({ color }) => <FontAwesome size={20} name="book" color={color} />,
								}}
							/>

							<Tabs.Screen
								name="search"
								options={{
									headerShown: false,
									title: 'Search',
									tabBarIcon: ({ color }) => <FontAwesome size={20} name="search" color={color} />,
								}}
							/>
						</Tabs>
					)}
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
