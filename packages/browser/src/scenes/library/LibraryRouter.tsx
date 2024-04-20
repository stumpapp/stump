import React, { lazy, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'

import LibraryLayout from './LibraryLayout.tsx'
import LibraryAdminLayout from './management/LibraryAdminLayout.tsx'

const CreateLibraryScene = lazy(() => import('./management/CreateLibraryScene.tsx'))
const LibrarySettingsScene = lazy(() => import('./management/LibrarySettingsScene.tsx'))
const LibraryExplorerScene = lazy(() => import('./LibraryExplorerScene.tsx'))
const LibrarySeriesScene = lazy(() => import('./LibrarySeriesScene.tsx'))
const LibraryBooksScene = lazy(() => import('./LibraryBooksScene.tsx'))
const LibraryListScene = lazy(() => import('./LibraryListScene.tsx'))

export default function LibraryRouter() {
	const { checkPermission } = useAppContext()

	const canAccessExplorer = useMemo(() => checkPermission('file:explorer'), [checkPermission])

	return (
		<Routes>
			<Route path="" element={<LibraryListScene />} />
			<Route path=":id/*" element={<LibraryLayout />}>
				<Route path="" element={<Navigate to="series" replace />} />
				<Route path="series" element={<LibrarySeriesScene />} />
				<Route path="books" element={<LibraryBooksScene />} />
				{canAccessExplorer && <Route path="files" element={<LibraryExplorerScene />} />}
				<Route element={<LibraryAdminLayout />}>
					<Route path="settings" element={<LibrarySettingsScene />} />
				</Route>
			</Route>
			<Route element={<LibraryAdminLayout />}>
				<Route path="create" element={<CreateLibraryScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
