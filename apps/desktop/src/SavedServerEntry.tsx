import { StumpRouter } from '@stump/browser'
import { useUserStore } from '@stump/browser/stores'
import {
	queryClient,
	SDKContext,
	StumpClientContextProvider,
	StumpClientProps,
} from '@stump/client'
import {
	Api,
	AuthUser,
	isAxiosError,
	isNetworkError,
	JwtTokenPair,
	LoginResponse,
} from '@stump/sdk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { match, P } from 'ts-pattern'

import { ServerConfig, useSavedServers } from './stores/savedServer'

type Props = Pick<StumpClientProps, 'tauriRPC'>

export default function SavedServerEntry({ tauriRPC }: Props) {
	const navigate = useNavigate()

	const { savedServers, getServerToken, saveServerToken, deleteServerToken, getServerConfig } =
		useSavedServers()
	const { serverId } = useParams<{ serverId: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverId),
		[serverId, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
	const [user, setUser] = useUserStore((store) => [store.user, store.setUser])

	const isServerAccessible = useRef(true)

	useEffect(() => {
		if (!activeServer) return

		const configureSDK = async () => {
			const { id, url } = activeServer
			const storedToken = await getServerToken(id)
			const serverConfig = await getServerConfig(id)

			const authMethod = match(serverConfig?.auth)
				.with({ bearer: P.string }, () => 'api-key' as const)
				.otherwise(() => 'token' as const)

			const instance = new Api({ baseURL: url, authMethod })
			instance.tokens = match(storedToken)
				.with({ jwt: P.any }, ({ jwt }) => jwt)
				.otherwise(() => undefined)
			const existingToken = await instance.getOrRefreshTokens()

			try {
				const authedInstance = await authSDKInstance(instance, {
					config: serverConfig,
					existingToken,
					saveToken: async (token, forUser) => {
						if (token) {
							await saveServerToken(activeServer?.id || 'dev', { jwt: token })
						}
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
	}, [
		activeServer,
		sdk,
		getServerToken,
		isAuthDialogOpen,
		getServerConfig,
		saveServerToken,
		setUser,
	])

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
	}, [sdk, user, setUser])

	useEffect(() => {
		return () => {
			if (!isServerAccessible.current) {
				queryClient.clear()
			}
			isServerAccessible.current = true
		}
	}, [])

	const handleAuthDialogClose = useCallback(
		(loginResp?: LoginResponse) => {
			if (!loginResp || !('forUser' in loginResp) || !activeServer) {
				navigate('/')
			} else {
				const { forUser, ...token } = loginResp
				const instance = new Api({
					baseURL: activeServer.url,
					authMethod: 'token',
				})
				instance.tokens = token
				setSDK(instance)
				saveServerToken(activeServer?.id || 'dev', { jwt: token })
				setUser(forUser)
				setIsAuthDialogOpen(false)
			}
		},
		[activeServer, navigate, saveServerToken, setUser],
	)

	const onAuthError = useCallback(async () => {
		// Get rid of the token
		if (activeServer) {
			await deleteServerToken(activeServer.id)
		}
		// We need to retrigger the auth dialog, so we'll let the effect handle it
		setIsAuthDialogOpen(false)
		setSDK(null)
		setUser(null)
	}, [activeServer, deleteServerToken, setUser])

	const handleAuthenticated = useCallback(
		async (_user: AuthUser, tokens?: JwtTokenPair) => {
			try {
				if (tokens && activeServer) {
					await tauriRPC?.setTokens(activeServer.id, { jwt: tokens })
				}
			} catch (err) {
				console.error('Failed to store tokens in secure store', err)
			}
		},
		[tauriRPC, activeServer],
	)

	const onServerConnectionError = useCallback(
		(connected: boolean) => {
			queryClient.clear()
			isServerAccessible.current = connected
			setSDK(null)
			setUser(null)
		},
		[setUser],
	)

	const onLogout = useCallback(async () => {
		navigate('/')
	}, [navigate])

	useEffect(() => {
		if (!activeServer) {
			navigate('/')
		}
	}, [activeServer, navigate])

	if (!sdk) {
		return null
	}

	// TODO(desktop): ServerAuthDialog
	return (
		<StumpClientContextProvider
			onUnauthenticatedResponse={onAuthError}
			onConnectionWithServerChanged={onServerConnectionError}
			onLogout={onLogout}
			onAuthenticated={handleAuthenticated}
			tauriRPC={tauriRPC}
		>
			<SDKContext.Provider value={{ sdk, setSDK }}>
				{/* <ServerAuthDialog isOpen={isAuthDialogOpen} onClose={handleAuthDialogClose} /> */}
				{sdk.isAuthed && <StumpRouter basePath={`/server/${serverId}`} />}
			</SDKContext.Provider>
		</StumpClientContextProvider>
	)
}

type AuthSDKParams = {
	config: ServerConfig | null
	existingToken?: JwtTokenPair | null
	saveToken?: (token: JwtTokenPair, forUser: AuthUser) => Promise<void>
}

// TODO: See if we can move this to the client for better code sharing between platforms
/**
 * Authenticate an SDK instance with the provided configuration and token information.
 *
 * @param instance A base instance of the SDK. This will be mutated with the auth token
 * @param params An object containing the configuration and token information
 *
 * @returns The instance of the SDK with the auth token set
 * @throws If the server is unreachable, a failed login attempt does not throw an error
 */
export const authSDKInstance = async (
	instance: Api,
	{ config, existingToken, saveToken }: AuthSDKParams,
): Promise<Api | null> => {
	if (existingToken) {
		instance.tokens = existingToken
	} else {
		await match(config?.auth)
			.with({ bearer: P.string }, ({ bearer }) => {
				instance.staticToken = bearer
			})
			.with(
				{
					basic: P.shape({
						username: P.string,
						password: P.string,
					}),
				},
				async ({ basic: { username, password } }) => {
					const tokens = await login(instance, { password, saveToken, username })
					instance.tokens = tokens
				},
			)
			.otherwise(() => {})
	}

	if (!instance.isAuthed) {
		return null
	}

	return instance
}

type LoginParams = {
	username: string
	password: string
} & Pick<AuthSDKParams, 'saveToken'>

const login = async (instance: Api, { username, password, saveToken }: LoginParams) => {
	try {
		const result = await instance.auth.login({ password, username })
		if ('forUser' in result) {
			const { forUser, ...token } = result
			await saveToken?.(token, forUser)
			return token
		}
	} catch (error) {
		const axiosError = isAxiosError(error) ? error : null
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'
		if (isNetworkError) {
			throw error
		} else {
			console.warn('Failed to login:', error)
		}
	}
}
