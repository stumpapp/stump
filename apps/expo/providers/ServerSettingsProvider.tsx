import { createContext, useContext } from 'react'

import { SavedServer, useSavedServerStore } from '~/stores/savedServer'

import { useActiveServerSafe } from './ActiveServerProvider'

type AllowedUpdateParams = Omit<Partial<SavedServer>, 'id' | 'kind' | 'avatar'>

// TODO: add patch functions to ctx thru provider
type ServerSettingsContextValue = {
	activeServer: SavedServer
	patchServer: (updates: AllowedUpdateParams) => void
}

const ServerSettingsContext = createContext<ServerSettingsContextValue | undefined>(undefined)

type ServerSettingsProviderProps = {
	activeServer?: SavedServer
	children: React.ReactNode
}

export function ServerSettingsProvider({ activeServer, children }: ServerSettingsProviderProps) {
	const activeServerCtx = useActiveServerSafe()

	const resolvedServer = activeServer || activeServerCtx?.activeServer

	const patchServer = (updates: AllowedUpdateParams) => {
		if (!resolvedServer) return
		const updatedServer = { ...resolvedServer, ...updates }
		useSavedServerStore.getState().editServer(updatedServer.id, updatedServer)
	}

	if (resolvedServer == null) {
		return null
	}

	return (
		<ServerSettingsContext.Provider
			value={{
				activeServer: resolvedServer,
				patchServer,
			}}
		>
			{children}
		</ServerSettingsContext.Provider>
	)
}

export const useServerSettingsContext = () => {
	const context = useContext(ServerSettingsContext)
	if (!context) {
		throw new Error('useServerSettingsContext must be used within a ServerSettingsProvider')
	}
	return context
}
