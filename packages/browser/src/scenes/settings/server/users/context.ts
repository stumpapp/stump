import { type User } from '@stump/sdk'
import { PaginationState } from '@tanstack/react-table'
import { createContext, useContext } from 'react'

import { noop } from '@/utils/misc'

export type UserManagementContextProps = {
	users: User[]
	deletingUser: User | null
	setDeletingUser: (user: User | null) => void
	isRefetchingUsers: boolean
	pageCount: number
	pagination: PaginationState
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}

export const UserManagementContext = createContext<UserManagementContextProps>({
	deletingUser: null,
	isRefetchingUsers: false,
	pageCount: 0,
	pagination: {
		pageIndex: 0,
		pageSize: 10,
	},
	setDeletingUser: noop,
	setPagination: noop,
	users: [],
})
export const useUserManagementContext = () => useContext(UserManagementContext)
