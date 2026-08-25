import { UserPermission } from '@stump/graphql'
import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import { useAppContext } from '@/context'

import UpdateUserScene from './create-or-update/UpdateUserScene.tsx'

const UsersScene = lazy(() => import('./UsersScene.tsx'))
const CreateUserScene = lazy(() => import('./create-or-update/CreateUserScene.tsx'))

export default function UsersRouter() {
	const { checkPermission } = useAppContext()

	const canManageUsers = checkPermission(UserPermission.ManageUsers)

	return (
		<Routes>
			<Route path="" element={<UsersScene />} />
			{canManageUsers && <Route path="create" element={<CreateUserScene />} />}
			{canManageUsers && <Route path=":id/manage" element={<UpdateUserScene />} />}
		</Routes>
	)
}
