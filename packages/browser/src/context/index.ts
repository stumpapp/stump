export { Link } from './Link'
export { RouterProvider, useRouterContext } from './RouterContext'
export { useNavigate } from './useNavigate'

import { UserPermission } from '@stump/graphql'
import { AuthUser } from '@stump/sdk'
import { createContext, useContext } from 'react'

export type PermissionEnforcerOptions = {
	onFailure: () => void
}

export type IAppContext = {
	user: AuthUser
	isServerOwner: boolean
	checkPermission: (permission: UserPermission) => boolean
	enforcePermission: (permission: UserPermission, options?: PermissionEnforcerOptions) => void
	logout: () => Promise<void>
}

export const AppContext = createContext<IAppContext>({} as IAppContext)
export const useAppContext = () => useContext(AppContext)

export const useCheckPermission = (permission: UserPermission) => {
	const { checkPermission } = useAppContext()
	return checkPermission(permission)
}
