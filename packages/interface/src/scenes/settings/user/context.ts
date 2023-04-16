import { type User } from '@stump/types'
import { createContext, useContext } from 'react'

export type UserManagementContextProps = {
	users: User[]
	isRefetchingUsers: boolean
}

export const UserManagementContext = createContext<UserManagementContextProps>({
	isRefetchingUsers: false,
	users: [],
})
export const useUserManagementContext = () => useContext(UserManagementContext)
