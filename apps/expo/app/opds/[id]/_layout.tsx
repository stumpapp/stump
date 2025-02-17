import { SDKContext, StumpClientContextProvider } from '@stump/client'
import { Api, authDocument, constants } from '@stump/sdk'
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { match, P } from 'ts-pattern'

import { ActiveServerContext } from '~/components/activeServer'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const router = useRouter()

	const { savedServers, getServerToken, deleteServerToken, getServerConfig } = useSavedServers()
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
			const shouldFormatURL = kind === 'stump'

			const instance = match(config?.auth)
				.with(
					{ basic: P.shape({ username: P.string, password: P.string }) },
					({ basic: { username, password } }) => {
						const api = new Api({ baseURL: url, authMethod: 'basic', shouldFormatURL })
						api.basicAuth = { username, password }
						return api
					},
				)
				.with({ bearer: P.string }, ({ bearer: token }) => {
					const api = new Api({ baseURL: url, authMethod: 'token', shouldFormatURL })
					api.token = token
					return api
				})
				// TODO: figure out what the deal is otherwise. Session auth? Assume basic or sm?
				.otherwise(() => new Api({ baseURL: url, authMethod: 'basic', shouldFormatURL }))

			const customHeaders = {
				...config?.customHeaders,
				...('basic' in (config?.auth || {})
					? {
							[constants.STUMP_SAVE_BASIC_SESSION_HEADER]: 'false',
						}
					: {}),
			}

			if (Object.keys(customHeaders).length) {
				instance.customHeaders = customHeaders
			}

			setSDK(instance)
		}

		if (!sdk) {
			configureSDK()
		}
	}, [activeServer, sdk, getServerToken, getServerConfig])

	const onAuthError = useCallback(
		async (_: string | undefined, data: unknown) => {
			console.error('Auth error', data)
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

			// Get rid of the token
			if (activeServer) {
				await deleteServerToken(activeServer.id)
			}

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
		[activeServer, deleteServerToken, router],
	)

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
					<Stack screenOptions={{ headerShown: false }} />
				</SDKContext.Provider>
			</StumpClientContextProvider>
		</ActiveServerContext.Provider>
	)
}
