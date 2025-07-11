import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import UpdateUserScene from './create-or-update/UpdateUserScene.tsx'

const UserManagementScene = lazy(() => import('./UsersScene.tsx'))
const CreateUserScene = lazy(() => import('./create-or-update/CreateUserScene.tsx'))

export default function UsersRouter() {
	return (
		<Routes>
			<Route path="" element={<UserManagementScene />} />
			<Route path="create" element={<CreateUserScene />} />
			<Route path=":id/manage" element={<UpdateUserScene />} />
		</Routes>
	)
}
