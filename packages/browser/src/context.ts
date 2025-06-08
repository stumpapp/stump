import { User, UserPermission } from '@stump/sdk'
import { createContext, useContext } from 'react'

export type PermissionEnforcerOptions = {
	onFailure: () => void
}

export type IAppContext = {
	// TODO(graphql): Swap User to GraphQL user
	user: User
	isServerOwner: boolean
	// TODO(graphql): Swap UserPermission to GraphQL enum
	checkPermission: (permission: UserPermission) => boolean
	enforcePermission: (permission: UserPermission, options?: PermissionEnforcerOptions) => void
}

export const AppContext = createContext<IAppContext>({} as IAppContext)
export const useAppContext = () => useContext(AppContext)
