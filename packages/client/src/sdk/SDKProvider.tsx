import { Api, AuthenticationMethod } from '@stump/sdk'
import { PropsWithChildren, useEffect, useState } from 'react'

import { useClientContext } from '@/context'

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
			console.debug('No baseURL or Tauri RPC, likely running in browser')
			return
		}

		console.debug('Initializing SDK with', baseURL, authMethod)
		const instance = new Api(baseURL, authMethod)

		if (!tauriRPC || authMethod === 'session') {
			console.debug('No Tauri RPC or using session auth method')
			setSDK(instance)
			return
		}

		const setExistingToken = async () => {
			console.debug('Checking for existing token')
			try {
				const currentServer = await tauriRPC.getCurrentServerName()
				if (!currentServer) {
					console.warn('No active server found')
					setSDK(instance)
					return
				}

				const token = await tauriRPC.getApiToken(currentServer)
				if (token) {
					console.debug('Found existing token for', currentServer)
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

	return <SDKContext.Provider value={{ sdk }}>{children}</SDKContext.Provider>
}
