import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'
import LibraryAdminLayout from './admins/LibraryAdminLayout'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const CreateLibraryScene = lazily(() => import('./admins/CreateLibraryScene.tsx'))
const ManageLibraryScene = lazily(() => import('./admins/EditLibraryScene.tsx'))
const LibraryExplorerScene = lazily(() => import('./explorer/LibraryExplorerScene.tsx'))
const LibraryOverviewScene = lazily(() => import('./LibraryOverviewScene.tsx'))

export default function LibraryRouter() {
	return (
		<Routes>
			<Route path=":id/explore" element={<LibraryExplorerScene />} />
			<Route path=":id" element={<LibraryOverviewScene />} />
			<Route element={<LibraryAdminLayout />}>
				<Route path="create" element={<CreateLibraryScene />} />
				<Route path=":id/manage" element={<ManageLibraryScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
