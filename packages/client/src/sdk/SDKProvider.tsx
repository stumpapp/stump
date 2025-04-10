import { Api, AuthenticationMethod } from '@stump/sdk'
import { PropsWithChildren, useEffect, useState } from 'react'
import { RelayEnvironmentProvider } from 'react-relay'

import { createEnvironment } from '@/relay'

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

				const token = await tauriRPC.getApiToken(currentServer)
				if (token) {
					instance.token = token
				}
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

	return (
		<RelayEnvironmentProvider environment={createEnvironment(sdk)}>
			<SDKContext.Provider value={{ sdk, setSDK }}>{children}</SDKContext.Provider>
		</RelayEnvironmentProvider>
	)
}
