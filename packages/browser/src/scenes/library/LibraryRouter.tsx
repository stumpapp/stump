import React, { lazy, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'

import LibraryAdminLayout from './management/LibraryAdminLayout.tsx'

const CreateLibraryScene = lazy(
	() => import('./management/create-or-update/CreateLibraryScene.tsx'),
)
const ManageLibraryScene = lazy(() => import('./management/create-or-update/EditLibraryScene.tsx'))
const LibraryExplorerScene = lazy(() => import('./explorer/LibraryExplorerScene.tsx'))
const LibraryOverviewScene = lazy(() => import('./LibraryOverviewScene.tsx'))

export default function LibraryRouter() {
	const { checkPermission } = useAppContext()

	const canAccessExplorer = useMemo(() => checkPermission('file:explorer'), [checkPermission])

	return (
		<Routes>
			{canAccessExplorer && <Route path=":id/explore" element={<LibraryExplorerScene />} />}
			<Route path=":id" element={<LibraryOverviewScene />} />
			<Route element={<LibraryAdminLayout />}>
				<Route path="create" element={<CreateLibraryScene />} />
				<Route path=":id/manage" element={<ManageLibraryScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
