import { UserPermission } from '@stump/graphql'
import { AuthUser } from '@stump/sdk'
import { createContext, useCallback, useContext } from 'react'

import { useActiveServer } from './ActiveServerProvider'

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

type StumpServerProviderProps = {
	user: AuthUser | null
	children: React.ReactNode
}

export function StumpServerProvider({ user, children }: StumpServerProviderProps) {
	const checkPermission = useCallback(
		(permission: UserPermission) =>
			user?.isServerOwner || user?.permissions.includes(permission) || false,
		[user],
	)

	const enforcePermission = useCallback(
		(permission: UserPermission, { onFailure }: PermissionEnforcerOptions = {}) => {
			if (!checkPermission(permission)) {
				onFailure?.()
			}
		},
		[checkPermission],
	)

	return (
		<StumpServerContext.Provider
			value={{
				user,
				isServerOwner: user?.isServerOwner || false,
				checkPermission,
				enforcePermission,
			}}
		>
			{children}
		</StumpServerContext.Provider>
	)
}

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
