import { UserPermission } from '@stump/graphql'
import { lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { useAppContext } from '@/context'

import UserSmartListLayout from './UserSmartListLayout.tsx'
import UserSmartListRouter from './UserSmartListRouter.tsx'

const UserSmartListsScene = lazy(() => import('./UserSmartListsScene.tsx'))
const CreateSmartListScene = lazy(() => import('../createSmartList/CreateSmartListScene.tsx'))

export default function SmartListRouter() {
	const { checkPermission } = useAppContext()

	const navigate = useNavigate()
	const canAccess = checkPermission(UserPermission.AccessSmartList)
	useEffect(() => {
		if (!canAccess) {
			navigate('..', { replace: true })
		}
	}, [canAccess, navigate])

	if (!canAccess) {
		return null
	}

	return (
		<Routes>
			<Route path="" element={<UserSmartListsScene />} />
			<Route path=":id/*" element={<UserSmartListLayout />}>
				<Route path="*" element={<UserSmartListRouter />} />
			</Route>
			<Route path="create" element={<CreateSmartListScene />} />
			<Route path="*" element={<Navigate to="/404" replace />} />
		</Routes>
	)
}
