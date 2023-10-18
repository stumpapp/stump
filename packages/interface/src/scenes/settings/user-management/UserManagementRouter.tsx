import { useUsersQuery } from '@stump/client'
import { User } from '@stump/types'
import { PaginationState } from '@tanstack/react-table'
import React, { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../../AppRouter.tsx'
import { useAppContext } from '../../../context.ts'
import { UserManagementContext } from './context.ts'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const UserManagementScene = lazily(() => import('./UserManagementScene.tsx'))
const CreateUserScene = lazily(() => import('./CreateUserScene.tsx'))

export default function UserManagementRouter() {
	const [deletingUser, setDeletingUser] = useState<User | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	const { isServerOwner } = useAppContext()
	const {
		users,
		pageData,
		isRefetching: isRefetchingUsers,
	} = useUsersQuery({
		enabled: isServerOwner,
		page: pagination.pageIndex,
		page_size: pagination.pageSize,
		params: {
			include_read_progresses: true,
			include_session_count: true,
		},
	})

	if (!isServerOwner) {
		return <Navigate to="/404" />
	}

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
			</Routes>
		</UserManagementContext.Provider>
	)
}
