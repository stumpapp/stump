import { queryClient, SDKContext, StumpClientContextProvider } from '@stump/client'
import { UserPermission } from '@stump/graphql'
import { Api, AuthUser, LoginResponse } from '@stump/sdk'
import { isAxiosError } from 'axios'
import { Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { match, P } from 'ts-pattern'

import { ActiveServerContext, StumpServerContext } from '~/components/activeServer'
import { PermissionEnforcerOptions } from '~/components/activeServer/context'
import ServerAuthDialog from '~/components/ServerAuthDialog'
import ServerConnectFailed from '~/components/ServerConnectFailed'
import ServerErrorBoundary from '~/components/ServerErrorBoundary'
import { FullScreenLoader } from '~/components/ui'
import { authSDKInstance } from '~/lib/sdk/auth'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'

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

	const cachedInstance = useRef(useCacheStore((state) => state.sdks[serverID || '']))
	const cacheStore = useCacheStore((state) => ({
		addInstanceToCache: state.addSDK,
		removeInstanceFromCache: state.removeSDK,
	}))

	const [sdk, setSDK] = useState<Api | null>(() => cachedInstance.current || null)
	const [isInitiallyConnecting, setIsInitiallyConnecting] = useState(() => !cachedInstance.current)
	const [isAutoAuthenticating, setIsAutoAuthenticating] = useState(false)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
	const [user, setUser] = useState<AuthUser | null>(null)

	const isServerAccessible = useRef(true)

	useEffect(() => {
		if (!activeServer) return
		if (isAutoAuthenticating || !isServerAccessible.current) return

		const configureSDK = async () => {
			setIsInitiallyConnecting(false)

			const { id, url } = activeServer
			const storedToken = await getServerToken(id)
			const serverConfig = await getServerConfig(id)

			const authMethod = match(serverConfig?.auth)
				.with({ bearer: P.string }, () => 'api-key' as const)
				.otherwise(() => 'token' as const)

			const instance = new Api({
				baseURL: url,
				authMethod,
				customHeaders: serverConfig?.customHeaders,
			})
			instance.tokens = storedToken || undefined
			const existingToken = await instance.getOrRefreshTokens()

			try {
				const authedInstance = await authSDKInstance(instance, {
					config: serverConfig,
					existingToken,
					saveToken: async (token, forUser) => {
						if (token) {
							await saveServerToken(activeServer?.id || 'dev', token)
						}
						setUser(forUser)
					},
					onAttemptingAutoAuth: (attempting) => {
						setIsAutoAuthenticating(attempting)
					},
				})

				if (!authedInstance) {
					setIsAuthDialogOpen(true)
				}

				setSDK(authedInstance || instance)
				if (authedInstance) {
					cacheStore.addInstanceToCache(activeServer.id, authedInstance)
				}
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
	}, [
		activeServer,
		sdk,
		getServerToken,
		isAuthDialogOpen,
		getServerConfig,
		saveServerToken,
		cacheStore,
		isAutoAuthenticating,
	])

	useEffect(
		() => {
			if (user || !sdk || !sdk.isAuthed) return

			const fetchUser = async () => {
				try {
					const user = await sdk.auth.me()
					setUser(user)
				} catch (error) {
					if (isNetworkError(error)) {
						isServerAccessible.current = false
						cacheStore.removeInstanceFromCache(activeServer?.id || 'unknown')
					}
				}
			}

			fetchUser()
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[sdk, user],
	)

	const onResetState = useCallback(() => {
		isServerAccessible.current = true
		setIsInitiallyConnecting(true)
		setSDK(null)
		setUser(null)
		setIsAuthDialogOpen(false)
		setIsAutoAuthenticating(false)
	}, [])

	/**
	 * At a glace this is a little hard to parse, but what we're doing here is setting up an
	 * effect to run each time this screen is focused which, on cleanup, resets the state if
	 * the server was not accessible. This ensures that we actually retry the connection
	 * when the user comes back, since expo-router doesn't seem to unmount/remount the layout
	 */
	useFocusEffect(
		useCallback(() => {
			return () => {
				if (!isServerAccessible.current) {
					queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey.includes(serverID) })
					onResetState()
				}
				isServerAccessible.current = true
			}
		}, [serverID, onResetState]),
	)

	const handleAuthDialogClose = useCallback(
		(loginResp?: LoginResponse) => {
			if (!loginResp || !('forUser' in loginResp) || !activeServer) {
				router.dismissAll()
			} else {
				const { forUser, ...token } = loginResp
				const instance = new Api({
					baseURL: activeServer.url,
					authMethod: 'token',
				})
				instance.tokens = token
				setSDK(instance)
				saveServerToken(activeServer?.id || 'dev', token)
				setUser(forUser)
				setIsAuthDialogOpen(false)
				cacheStore.removeInstanceFromCache(activeServer.id)
			}
		},
		[activeServer, router, saveServerToken, cacheStore],
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
			user?.isServerOwner || user?.permissions.includes(permission) || false,
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

	// TODO: Maybe a conditional useFocusEffect to redirect to fix the issue someone reported
	// wrt the not auto-navigating to active server on initial load?

	if (!activeServer) {
		// @ts-expect-error: It's fine
		return <Redirect href="/" />
	}

	if (!isServerAccessible.current) {
		return <ServerConnectFailed onRetry={onResetState} />
	}

	if (isInitiallyConnecting) {
		return null
	}

	if (isAutoAuthenticating) {
		return <FullScreenLoader label="Authenticating..." />
	}

	if (!sdk) {
		return <FullScreenLoader label="Connecting..." />
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
					isServerOwner: user?.isServerOwner || false,
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

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	return <ServerErrorBoundary error={error} onRetry={() => retry()} />
}
