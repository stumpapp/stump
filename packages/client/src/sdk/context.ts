import { Api } from '@stump/sdk'
import { createContext, useContext } from 'react'

export type ISDKContext = {
	sdk: Api
	setSDK: (sdk: Api) => void
}

export const SDKContext = createContext<ISDKContext | null>(null)

export const useSDK = () => {
	const context = useContext(SDKContext)
	if (!context) {
		throw new Error('useSDK must be used within a SDKProvider')
	}
	return context
}

export const useSDKSafe = () => useContext(SDKContext)
