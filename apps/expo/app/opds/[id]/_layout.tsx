import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api } from '@stump/sdk'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { match, P } from 'ts-pattern'

import { ActiveServerContext } from '~/components/activeServer'
// import ServerAuthDialog from '~/components/ServerAuthDialog'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const router = useRouter()

	const { savedServers, getServerToken, deleteServerToken, getServerConfig, createServerConfig } =
		useSavedServers()
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const activeServer = useMemo(
		() => savedServers.find((server) => server.id === serverID),
		[serverID, savedServers],
	)

	const [sdk, setSDK] = useState<Api | null>(null)
	const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

	useEffect(() => {
		if (!activeServer) return

		const configureSDK = async () => {
			const { id, url } = activeServer

			const config = await getServerConfig(id)

			const instance = match(config?.auth)
				.with(
					{ basic: P.shape({ username: P.string, password: P.string }) },
					({ basic: { username, password } }) => {
						const api = new Api({ baseURL: url, authMethod: 'basic' })
						api.basicAuth = { username, password }
						return api
					},
				)
				.with({ bearer: P.string }, ({ bearer: token }) => {
					const api = new Api({ baseURL: url, authMethod: 'token' })
					api.token = token
					return api
				})
				// TODO: figure out what the deal is otherwise. Session auth? Assume basic or sm?
				.otherwise(() => new Api({ baseURL: url, authMethod: 'basic' }))

			if (config?.customHeaders) {
				instance.customHeaders = config.customHeaders
			}

			if (!instance.token && !instance.basicAuth) {
				setIsAuthDialogOpen(true)
			}

			setSDK(instance)
		}

		if (!sdk && !isAuthDialogOpen) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerToken, isAuthDialogOpen, getServerConfig])

	const handleAuthDialogClose = useCallback(
		async (username: string, password: string, headers: Record<string, string> = {}) => {
			if (activeServer) {
				createServerConfig(activeServer.id, {
					auth: { basic: { username, password } },
					customHeaders: headers,
				})
				const api = new Api({ baseURL: activeServer.url, authMethod: 'basic' })
				api.basicAuth = { username, password }

				setSDK((current) => {
					if (current) {
						api.customHeaders = current.customHeaders
					}
					return api
				})
				setIsAuthDialogOpen(false)
			} else {
				router.dismissAll()
			}
		},
		[activeServer, router, createServerConfig],
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
				<SDKContext.Provider value={{ sdk }}>
					{/* <ServerAuthDialog isOpen={isAuthDialogOpen} onClose={handleAuthDialogClose} /> */}
					<Stack screenOptions={{ headerShown: false }} />
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
