import { UserPermission } from '@stump/graphql'
import { AuthUser } from '@stump/sdk'
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

/**
 * Safe variant of useActiveServer that returns undefined if there's no active server
 * Pretty much just used for features that persist across servers (e.g., downloads)
 */
export const useActiveServerSafe = () => useContext(ActiveServerContext)

export type PermissionEnforcerOptions = {
	onFailure?: () => void
}

export type IStumpServerContext = {
	user: AuthUser | null
	isServerOwner: boolean
	checkPermission: (permission: UserPermission) => boolean
	enforcePermission: (permission: UserPermission, options?: PermissionEnforcerOptions) => void
}

export const StumpServerContext = createContext<IStumpServerContext | undefined>(undefined)

export const useStumpServer = () => {
	const context = useContext(StumpServerContext)
	const activeServerCtx = useActiveServer()
	if (!context) {
		throw new Error('useStumpServer must be used within a StumpServerProvider')
	}
	return {
		...context,
		...activeServerCtx,
	}
}
