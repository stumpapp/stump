import { AccessRole } from '@stump/graphql'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useSmartListContext } from './context.ts'
import SmartListSettingsRouter from './settings/SmartListSettingsRouter.tsx'

const UserSmartListItemsScene = lazy(() => import('./items/UserSmartListItemsScene.tsx'))

export default function UserSmartListRouter() {
	const { viewerRole } = useSmartListContext()

	const isWriter = viewerRole !== AccessRole.Reader

	return (
		<Suspense fallback={null}>
			<Routes>
				<Route path="" element={<Navigate to="items" replace />} />
				<Route path="items" element={<UserSmartListItemsScene />} />
				<Route
					path="settings/*"
					element={isWriter ? <SmartListSettingsRouter /> : <Navigate to=".." replace />}
				/>
			</Routes>
		</Suspense>
	)
}
