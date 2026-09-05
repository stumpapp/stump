import {
	parseGraphQLDateTime,
	queryClient,
	SDKContext,
	StumpClientContextProvider,
} from '@stump/client'
import { Api, AuthUser, LoginResponse } from '@stump/sdk'
import { isAxiosError } from 'axios'
import { Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import getProperty from 'lodash/get'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { match, P } from 'ts-pattern'

import { pullServerAvatar } from '~/backgroundTasks/pullServerLogo'
import { ServerConnectFailed, ServerErrorBoundary } from '~/components/error'
import ServerAuthDialog from '~/components/ServerAuthDialog'
import { FullScreenLoader } from '~/components/ui'
import { authSDKInstance } from '~/lib/sdk/auth'
import {
	ActiveServerProvider,
	useActiveServer,
	useUrlSwitch,
} from '~/providers/ActiveServerProvider'
import { StumpServerProvider } from '~/providers/StumpServerProvider'
import { usePreferencesStore, useSavedServers } from '~/stores'
import { useCacheStore } from '~/stores/cache'

// this is required for ensuring deep links don't just drop routes into a totally
// isolated stack, thereby stranding the user in the route.
// see docs.expo.dev/router/advanced/modals/#handle-deep-linked-modals
export const unstable_settings = {
	anchor: 'index',
}

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

	const { getServerToken, saveServerToken, deleteServerToken, getServerConfig } = useSavedServers()
	const { activeServer, effectiveServerUrl } = useActiveServer()

	const serverId = activeServer.id
	const cachedInstance = useRef(useCacheStore((state) => state.sdks[serverId]))
	const addInstanceToCache = useCacheStore((state) => state.addSDK)
	const removeInstanceFromCache = useCacheStore((state) => state.removeSDK)

	const [sdk, setSDK] = useState<Api | null>(() => cachedInstance.current || null)
	const [isInitiallyConnecting, setIsInitiallyConnecting] = useState(() => !cachedInstance.current)
	const [isAutoAuthenticating, setIsAutoAuthenticating] = useState(false)
	const [retryCounter, setRetryCounter] = useState(0)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
	const [user, setUser] = useState<AuthUser | null>(null)
	const [fatalError, setFatalError] = useState<Error | null>(null)

	const isServerAccessible = useRef(true)

	useUrlSwitch({ url: effectiveServerUrl, setSDK })

	useEffect(() => {
		if (isAutoAuthenticating || !isServerAccessible.current) return

		const configureSDK = async () => {
			setIsInitiallyConnecting(false)

			const storedToken = await getServerToken(serverId)
			const serverConfig = await getServerConfig(serverId)

			const authMethod = match(serverConfig?.auth)
				.with({ bearer: P.string }, () => 'api-key' as const)
				.otherwise(() => 'token' as const)

			const instance = new Api({
				baseURL: effectiveServerUrl,
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
							await saveServerToken(serverId, token)
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
					addInstanceToCache(serverId, authedInstance)
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
		serverId,
		effectiveServerUrl,
		sdk,
		getServerToken,
		isAuthDialogOpen,
		getServerConfig,
		saveServerToken,
		addInstanceToCache,
		isAutoAuthenticating,
		retryCounter,
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
						removeInstanceFromCache(serverId || 'unknown')
					}
				}
			}

			fetchUser()
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[sdk, user, serverId],
	)

	const didSyncAvatar = useRef(false)
	useEffect(() => {
		if (!user || !sdk || !sdk.isAuthed || didSyncAvatar.current) return

		const lastPulledAt = getProperty(activeServer.avatar, 'lastModified')
		const avatarUpdatedAt = parseGraphQLDateTime(user.avatar.lastModified)

		// no update stamp = no avatar (moving forward)
		if (!avatarUpdatedAt) return

		// pulled more recently than update = nothing to pull
		if (!!lastPulledAt && lastPulledAt >= avatarUpdatedAt) return

		const syncUserAvatar = async () => {
			await pullServerAvatar(activeServer, sdk)
			didSyncAvatar.current = true
		}
		syncUserAvatar()
	}, [sdk, activeServer, user])

	const onResetState = useCallback(() => {
		isServerAccessible.current = true
		setIsInitiallyConnecting(true)
		setSDK(null)
		setUser(null)
		setIsAuthDialogOpen(false)
		setIsAutoAuthenticating(false)
		setRetryCounter((k) => k + 1)
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
					queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey.includes(serverId) })
					onResetState()
				}
				isServerAccessible.current = true
			}
		}, [serverId, onResetState]),
	)

	const handleAuthDialogClose = useCallback(
		(loginResp?: LoginResponse) => {
			if (loginResp && 'forUser' in loginResp) {
				const { forUser, ...token } = loginResp
				const instance = new Api({
					baseURL: effectiveServerUrl,
					authMethod: 'token',
				})
				instance.tokens = token
				setSDK(instance)
				saveServerToken(serverId || 'dev', token)
				setUser(forUser)
				addInstanceToCache(serverId, instance)
			} else if (!loginResp && !sdk?.isAuthed) {
				router.dismissAll()
			}
		},
		[serverId, effectiveServerUrl, router, saveServerToken, addInstanceToCache, sdk],
	)

	// TODO: attempt reauth automatically when able

	const onAuthError = useCallback(async () => {
		// If the active server is using an API key, we can't re-auth automatically and
		// so we should set an error state to bubble up to the boundary during render
		const serverConfig = await getServerConfig(serverId)
		if (serverConfig?.auth && 'bearer' in serverConfig.auth) {
			setFatalError(
				new Error(
					'An auth-related error was encountered while using an API key. Please check that your key is still valid',
				),
			)
			return
		} else {
			// otherwise, just get rid of the token if it exists
			await deleteServerToken(serverId)
		}

		// We need to retrigger the auth dialog, so we'll let the effect handle it
		setIsAuthDialogOpen(false)
		setSDK(null)
		setUser(null)
	}, [serverId, deleteServerToken, getServerConfig])

	const onServerConnectionError = useCallback(
		(connected: boolean) => {
			queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey.includes(serverId) })
			isServerAccessible.current = connected
			setSDK(null)
			setUser(null)
		},
		[serverId],
	)

	// TODO: Maybe a conditional useFocusEffect to redirect to fix the issue someone reported
	// wrt the not auto-navigating to active server on initial load?

	if (!activeServer) {
		// @ts-expect-error: It's fine
		return <Redirect href="/" />
	}

	if (fatalError) {
		throw fatalError
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
		<StumpServerProvider user={user}>
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
		</StumpServerProvider>
	)
}

const isNetworkError = (error: unknown) => {
	const axiosError = isAxiosError(error) ? error : null
	return axiosError?.code === 'ERR_NETWORK'
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
	return <ServerErrorBoundary error={error} onRetry={() => retry()} />
}
