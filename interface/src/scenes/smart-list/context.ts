import { SmartList, SmartListMeta } from '@stump/types'
import { createContext, useContext } from 'react'

export type ISmartListContext = {
	list: SmartList
	meta?: SmartListMeta
	layout: 'table' | 'list'
	setLayout: (layout: 'table' | 'list') => void
}

export const SmartListContext = createContext<ISmartListContext | null>(null)

export const useSmartListContext = () => {
	const context = useContext(SmartListContext)

	if (!context) {
		throw new Error('useSmartListContext must be used within a SmartListContextProvider')
	}

	return context
}
