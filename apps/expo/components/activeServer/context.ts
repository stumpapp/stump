import { createContext, useContext } from 'react'

import { SavedServer } from '~/stores/savedServer'

export type IActiveServerContext = {
	activeServer: SavedServer
}

export const ActiveServerContext = createContext<IActiveServerContext | undefined>(undefined)

export const useActiveServer = () => {
	const context = useContext(ActiveServerContext)
	if (!context) {
		throw new Error('useActiveServer must be used within a ActiveServerProvider')
	}
	return context
}
