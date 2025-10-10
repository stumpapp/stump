import { Api, AuthenticationMethod } from '@stump/sdk'
import { PropsWithChildren, useEffect, useState } from 'react'
import { match, P } from 'ts-pattern'

import { useClientContext } from '../context'
import { SDKContext } from './context'

type SDKProviderProps = {
	baseURL: string
	authMethod: AuthenticationMethod
}

export function SDKProvider({
	baseURL,
	authMethod,
	children,
}: PropsWithChildren<SDKProviderProps>) {
	const [sdk, setSDK] = useState<Api | null>(null)
	const { tauriRPC } = useClientContext()

	useEffect(() => {
		if (!baseURL && !tauriRPC) {
			return
		}

		const instance = new Api({ baseURL, authMethod })

		// TODO: this needs to be rethought to generalize for both
		// tauri (desktop) and mobile (expo)
		if (!tauriRPC || authMethod === 'session') {
			setSDK(instance)
			return
		}

		const setExistingToken = async () => {
			try {
				const currentServer = await tauriRPC.getCurrentServerName()
				if (!currentServer) {
					console.warn('No active server found')
					setSDK(instance)
					return
				}

				const tokens = await tauriRPC.getTokens(currentServer)
				match(tokens)
					.with({ apiKey: P.string }, ({ apiKey }) => {
						instance.staticToken = apiKey
					})
					.with({ jwt: P.any }, ({ jwt }) => {
						instance.tokens = jwt
					})
					.otherwise(() => {
						console.warn('No tokens found for the current server')
					})
			} catch (error) {
				console.error('Failed to get existing token', error)
			}

			setSDK(instance)
		}

		setExistingToken()
	}, [baseURL, authMethod, tauriRPC])

	if (!sdk) {
		return null
	}

	return <SDKContext.Provider value={{ sdk, setSDK }}>{children}</SDKContext.Provider>
}
