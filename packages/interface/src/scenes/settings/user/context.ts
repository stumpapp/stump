import { type User } from '@stump/types'
import { PaginationState } from '@tanstack/react-table'
import { createContext, useContext } from 'react'

import { noop } from '../../../utils/misc'

export type UserManagementContextProps = {
	users: User[]
	isRefetchingUsers: boolean
	pageCount: number
	pagination: PaginationState
	setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
}

export const UserManagementContext = createContext<UserManagementContextProps>({
	isRefetchingUsers: false,
	pageCount: 0,
	pagination: {
		pageIndex: 0,
		pageSize: 10,
	},
	setPagination: noop,
	users: [],
})
export const useUserManagementContext = () => useContext(UserManagementContext)
