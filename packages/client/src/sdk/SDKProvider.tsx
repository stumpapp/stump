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
			return
		}

		const instance = new Api(baseURL, authMethod)

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

	return <SDKContext.Provider value={{ sdk }}>{children}</SDKContext.Provider>
}
