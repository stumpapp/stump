import { SmartList } from '@stump/types'
import { createContext, useContext } from 'react'

export type ISmartListContext = {
	list: SmartList
}

export const SmartListContext = createContext<ISmartListContext | null>(null)

export const useSmartListContext = () => {
	const context = useContext(SmartListContext)

	if (!context) {
		throw new Error('useSmartListContext must be used within a SmartListContextProvider')
	}

	return context
}
