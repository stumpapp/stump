import React, { useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'

import { LazyComponent } from '../../AppRouter'
import LibraryAdminLayout from './management/LibraryAdminLayout.tsx'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const CreateLibraryScene = lazily(() => import('./management/CreateLibraryScene.tsx'))
const ManageLibraryScene = lazily(() => import('./management/EditLibraryScene.tsx'))
const LibraryExplorerScene = lazily(() => import('./explorer/LibraryExplorerScene.tsx'))
const LibraryOverviewScene = lazily(() => import('./LibraryOverviewScene.tsx'))

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
