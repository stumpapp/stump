import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { useAppContext } from '@/context'

import { LazyComponent } from '../../AppRouter.tsx'
import UserSmartListLayout from './UserSmartListLayout.tsx'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const UserSmartListsScene = lazily(() => import('./UserSmartListsScene.tsx'))
const UserSmartListScene = lazily(() => import('./UserSmartListScene.tsx'))
const CreateSmartListScene = lazily(() => import('./create-or-update/CreateSmartListScene.tsx'))

export default function SmartListRouter() {
	const { checkPermission } = useAppContext()

	const navigate = useNavigate()
	const canAccess = checkPermission('smartlist:read')
	useEffect(() => {
		if (!canAccess) {
			navigate('..')
		}
	}, [canAccess, navigate])

	if (!canAccess) {
		return null
	}

	return (
		<Routes>
			<Route path="" element={<UserSmartListsScene />} />
			<Route path=":id" element={<UserSmartListLayout />}>
				<Route path="" element={<UserSmartListScene />} />
			</Route>
			<Route path="create" element={<CreateSmartListScene />} />
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
