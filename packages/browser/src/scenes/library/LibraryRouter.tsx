import { UserPermission } from '@stump/graphql'
import { lazy, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'

import LibraryLayout from './LibraryLayout.tsx'
import LibraryAdminLayout from './tabs/settings/LibraryAdminLayout.tsx'

const CreateLibraryScene = lazy(() => import('../createLibrary'))
const LibrarySettingsRouter = lazy(() => import('./tabs/settings'))
const LibraryExplorerScene = lazy(() => import('./tabs/files/LibraryExplorerScene.tsx'))
const LibrarySeriesScene = lazy(() => import('./tabs/series/LibrarySeriesScene.tsx'))
const LibraryBooksScene = lazy(() => import('./tabs/books/LibraryBooksScene.tsx'))
const LibrarySearchScene = lazy(() => import('../librarySearch'))

export default function LibraryRouter() {
	const { checkPermission } = useAppContext()

	const canAccessExplorer = useMemo(
		() => checkPermission(UserPermission.FileExplorer),
		[checkPermission],
	)

	return (
		<Routes>
			<Route path="" element={<LibrarySearchScene />} />
			<Route path=":id/*" element={<LibraryLayout />}>
				<Route path="" element={<Navigate to="series" replace />} />
				<Route path="series" element={<LibrarySeriesScene />} />
				<Route path="books" element={<LibraryBooksScene />} />
				{canAccessExplorer && <Route path="files" element={<LibraryExplorerScene />} />}

				<Route element={<LibraryAdminLayout />}>
					<Route path="settings/*" element={<LibrarySettingsRouter />} />
				</Route>
			</Route>

			<Route element={<LibraryAdminLayout applySceneDefaults={false} />}>
				<Route path="create" element={<CreateLibraryScene />} />
			</Route>

			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
