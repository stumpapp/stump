import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useSmartListContext } from './context.ts'

const UserSmartListSettingsScene = lazy(() => import('./settings/UserSmartListSettingsScene.tsx'))
const UserSmartListItemsScene = lazy(() => import('./items/UserSmartListItemsScene.tsx'))

export default function UserSmartListRouter() {
	const { viewerRole } = useSmartListContext()

	const isWriter = viewerRole !== 'Reader'

	return (
		<Suspense fallback={null}>
			<Routes>
				<Route path="" element={<Navigate to="items" replace />} />
				<Route path="items" element={<UserSmartListItemsScene />} />
				<Route
					path="settings"
					element={isWriter ? <UserSmartListSettingsScene /> : <Navigate to=".." replace />}
				/>
			</Routes>
		</Suspense>
	)
}
