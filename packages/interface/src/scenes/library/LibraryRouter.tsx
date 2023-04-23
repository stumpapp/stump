import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'
import LibraryAdminLayout from './admins/LibraryAdminLayout'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const CreateLibraryScene = lazily(() => import('./admins/CreateLibraryScene'))
const EditLibraryScene = lazily(() => import('./admins/EditLibraryScene'))
const LibraryExplorerScene = lazily(() => import('./explorer/LibraryExplorerScene'))
const LibraryOverviewScene = lazily(() => import('./LibraryOverviewScene'))

export default function LibraryRouter() {
	return (
		<Routes>
			<Route path=":id/explore" element={<LibraryExplorerScene />} />
			<Route path=":id" element={<LibraryOverviewScene />} />
			<Route element={<LibraryAdminLayout />}>
				<Route path="create" element={<CreateLibraryScene />} />
				<Route path=":id/edit" element={<EditLibraryScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
