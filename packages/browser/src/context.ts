import { User, UserPermission } from '@stump/sdk'
import { createContext, useContext } from 'react'

export type PermissionEnforcerOptions = {
	onFailure: () => void
}

export type IAppContext = {
	user?: User
	isServerOwner: boolean
	checkPermission: (permission: UserPermission) => boolean
	enforcePermission: (permission: UserPermission, options?: PermissionEnforcerOptions) => void
}

export const AppContext = createContext<IAppContext>({} as IAppContext)
export const useAppContext = () => useContext(AppContext)
