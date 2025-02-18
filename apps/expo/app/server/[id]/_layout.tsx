import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, CreatedToken } from '@stump/sdk'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { match, P } from 'ts-pattern'

import { ActiveServerContext } from '~/components/activeServer'
import ServerAuthDialog from '~/components/ServerAuthDialog'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const router = useRouter()

	const { savedServers, getServerToken, saveServerToken, deleteServerToken, getServerConfig } =
		useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

	const attemptLogin = useCallback(
		async (instance: Api, username: string, password: string) => {
			try {
				const result = await instance.auth.login({ password, username })
				if ('for_user' in result) {
					const { token } = result
					saveServerToken(activeServer?.id || 'dev', {
						expiresAt: new Date(token.expires_at),
						token: token.access_token,
					})
					return token.access_token
				}
			} catch (error) {
				console.error(error)
			}
		},
		[activeServer, saveServerToken],
	)

	useEffect(() => {
		if (!activeServer) return

		const configureSDK = async () => {
			const { id, url } = activeServer
			const existingToken = await getServerToken(id)
			const serverConfig = await getServerConfig(id)
			const instance = new Api({ baseURL: url, authMethod: 'token' })

			const token = await match(serverConfig?.auth)
				.with({ bearer: P.string }, ({ bearer }) => bearer)
				.with(
					{
						basic: P.shape({
							username: P.string,
							password: P.string,
						}),
					},
					async ({ basic: { username, password } }) => attemptLogin(instance, username, password),
				)
				.otherwise(() => existingToken?.token)

			if (!token) {
				setIsAuthDialogOpen(true)
			} else {
				instance.token = token
			}
			setSDK(instance)
		}

		if (!sdk && !isAuthDialogOpen) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerToken, isAuthDialogOpen, getServerConfig, attemptLogin])

	const handleAuthDialogClose = useCallback(
		(token?: CreatedToken) => {
			if (token && activeServer) {
				const { access_token, expires_at } = token
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
				setIsAuthDialogOpen(false)
			} else {
				router.dismissAll()
			}
		},
		[activeServer, router, saveServerToken],
	)

	const onAuthError = useCallback(async () => {
		// Get rid of the token
		if (activeServer) {
			await deleteServerToken(activeServer.id)
		}
		// We need to retrigger the auth dialog, so we'll let the effect handle it
		setIsAuthDialogOpen(false)
		setSDK(null)
	}, [activeServer, deleteServerToken])

	if (!activeServer) {
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
					<ServerAuthDialog isOpen={isAuthDialogOpen} onClose={handleAuthDialogClose} />
					<Stack screenOptions={{ headerShown: false }} />
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
