import { SaveSmartListInput } from '@stump/graphql'
import { createContext, useContext } from 'react'

import { useSmartListContext } from '../context'

export type ISmartListSettingsContext = {
	/**
	 * A function that issues a POST to update to the smart list,
	 * but resolves partial updates as a PATCH otherwise would
	 */
	patch: (updates: Partial<SaveSmartListInput>) => void
}

export const SmartListSettingsContext = createContext<ISmartListSettingsContext | null>(null)
export const useSmartListSettings = () => {
	const listCtx = useSmartListContext()
	const settingsCtx = useContext(SmartListSettingsContext)
	if (!settingsCtx) {
		throw new Error('SmartListSettingsContext is not provided')
	}
	return {
		list: listCtx.list,
		...settingsCtx,
	}
}
