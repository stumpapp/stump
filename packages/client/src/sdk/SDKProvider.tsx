import { Api, AuthenticationMethod } from '@stump/sdk'
import { PropsWithChildren, useEffect, useState } from 'react'

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

	useEffect(() => {
		if (baseURL) {
			setSDK(new Api(baseURL, authMethod))
		}
	}, [baseURL, authMethod])

	if (!sdk) {
		return null
	}

	return <SDKContext.Provider value={{ sdk }}>{children}</SDKContext.Provider>
}
