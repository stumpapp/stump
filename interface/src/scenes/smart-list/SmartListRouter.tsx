import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { useAppContext } from '@/context'

import { LazyComponent } from '../../AppRouter.tsx'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const UserSmartListsScene = lazily(() => import('./UserSmartListsScene.tsx'))

export default function BookClubRouter() {
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
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
