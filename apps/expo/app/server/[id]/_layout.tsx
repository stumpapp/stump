import { queryClient, SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, LoginResponse, User, UserPermission } from '@stump/sdk'
import { isAxiosError } from 'axios'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ActiveServerContext, StumpServerContext } from '~/components/activeServer'
import { PermissionEnforcerOptions } from '~/components/activeServer/context'
import ServerAuthDialog from '~/components/ServerAuthDialog'
import ServerConnectFailed from '~/components/ServerConnectFailed'
import { authSDKInstance } from '~/lib/sdk/auth'
import { usePreferencesStore, useSavedServers } from '~/stores'

export default function Screen() {
	const router = useRouter()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const { savedServers, getServerToken, saveServerToken, deleteServerToken, getServerConfig } =
		useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
	const [user, setUser] = useState<User | null>(null)

	const isServerAccessible = useRef(true)

	useEffect(() => {
		if (!activeServer) return

		const configureSDK = async () => {
			const { id, url } = activeServer
			const existingToken = await getServerToken(id)
			const serverConfig = await getServerConfig(id)
			const instance = new Api({ baseURL: url, authMethod: 'token' })

			try {
				const authedInstance = await authSDKInstance(instance, {
					config: serverConfig,
					existingToken,
					saveToken: async (token, forUser) => {
						await saveServerToken(activeServer?.id || 'dev', token)
						setUser(forUser)
					},
				})

				if (!authedInstance) {
					setIsAuthDialogOpen(true)
				}

				setSDK(authedInstance || instance)
			} catch (error) {
				const axiosError = isAxiosError(error) ? error : null
				const isNetworkError = axiosError?.code === 'ERR_NETWORK'

				if (isNetworkError) {
					isServerAccessible.current = false
				} else {
					setIsAuthDialogOpen(true)
					setSDK(instance)
				}
			}
		}

		if (!sdk && !isAuthDialogOpen) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerToken, isAuthDialogOpen, getServerConfig, saveServerToken])

	useEffect(() => {
		if (user || !sdk || !sdk.isAuthed) return

		const fetchUser = async () => {
			try {
				const user = await sdk.auth.me()
				setUser(user)
			} catch (error) {
				if (isNetworkError(error)) {
					isServerAccessible.current = false
				}
			}
		}

		fetchUser()
	}, [sdk, user])

	useEffect(() => {
		return () => {
			if (!isServerAccessible.current) {
				queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey.includes(serverID) })
			}
			isServerAccessible.current = true
		}
	}, [serverID])

	const handleAuthDialogClose = useCallback(
		(loginResp?: LoginResponse) => {
			if (!loginResp || !('for_user' in loginResp) || !activeServer) {
				router.dismissAll()
			} else {
				const {
					for_user,
					token: { access_token, expires_at },
				} = loginResp
				const instance = new Api({
					baseURL: activeServer.url,
					authMethod: 'token',
				})
				instance.token = access_token
				setSDK(instance)
				saveServerToken(activeServer?.id || 'dev', {
					expiresAt: new Date(expires_at),
					token: access_token,
				})
				setUser(for_user)
				setIsAuthDialogOpen(false)
			}
		},
		[activeServer, router, saveServerToken],
	)

	// TODO: attempt reauth automatically when able

	const onAuthError = useCallback(async () => {
		// Get rid of the token
		if (activeServer) {
			await deleteServerToken(activeServer.id)
		}
		// We need to retrigger the auth dialog, so we'll let the effect handle it
		setIsAuthDialogOpen(false)
		setSDK(null)
		setUser(null)
	}, [activeServer, deleteServerToken])

	const onServerConnectionError = useCallback(
		(connected: boolean) => {
			queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey.includes(serverID) })
			isServerAccessible.current = connected
			setSDK(null)
			setUser(null)
		},
		[serverID],
	)

	const checkPermission = useCallback(
		(permission: UserPermission) =>
			user?.is_server_owner || user?.permissions.includes(permission) || false,
		[user],
	)

	const enforcePermission = useCallback(
		(permission: UserPermission, { onFailure }: PermissionEnforcerOptions = {}) => {
			if (!checkPermission(permission)) {
				onFailure?.()
			}
		},
		[checkPermission],
	)

	if (!activeServer) {
		return <Redirect href="/" />
	}

	if (!isServerAccessible.current) {
		return <ServerConnectFailed />
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
			<StumpServerContext.Provider
				value={{
					user,
					isServerOwner: user?.is_server_owner || false,
					checkPermission,
					enforcePermission,
				}}
			>
				<StumpClientContextProvider
					onUnauthenticatedResponse={onAuthError}
					onConnectionWithServerChanged={onServerConnectionError}
				>
					<SDKContext.Provider value={{ sdk, setSDK }}>
						<ServerAuthDialog isOpen={isAuthDialogOpen} onClose={handleAuthDialogClose} />
						<Stack
							screenOptions={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
					</SDKContext.Provider>
				</StumpClientContextProvider>
			</StumpServerContext.Provider>
		</ActiveServerContext.Provider>
	)
}

const isNetworkError = (error: unknown) => {
	const axiosError = isAxiosError(error) ? error : null
	return axiosError?.code === 'ERR_NETWORK'
}
