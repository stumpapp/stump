import { useUsersQuery } from '@stump/client'
import { User } from '@stump/types'
import { PaginationState } from '@tanstack/react-table'
import React, { lazy, useState } from 'react'
import { Route, Routes } from 'react-router'

import { UserManagementContext } from './context.ts'
import UpdateUserScene from './create-or-update/UpdateUserScene.tsx'

const UserManagementScene = lazy(() => import('./UsersScene.tsx'))
const CreateUserScene = lazy(() => import('./create-or-update/CreateUserScene.tsx'))

export default function UsersRouter() {
	const [deletingUser, setDeletingUser] = useState<User | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	const {
		users,
		pageData,
		isRefetching: isRefetchingUsers,
	} = useUsersQuery({
		page: pagination.pageIndex,
		page_size: pagination.pageSize,
		params: {
			include_read_progresses: true,
			include_restrictions: true,
			include_session_count: true,
		},
	})

	return (
		<UserManagementContext.Provider
			value={{
				deletingUser,
				isRefetchingUsers,
				pageCount: pageData?.total_pages || -1,
				pagination,
				setDeletingUser,
				setPagination,
				users: users || [],
			}}
		>
			<Routes>
				<Route path="" element={<UserManagementScene />} />
				<Route path="create" element={<CreateUserScene />} />
				<Route path=":id/manage" element={<UpdateUserScene />} />
				{/* TODO: update user */}
			</Routes>
		</UserManagementContext.Provider>
	)
}
