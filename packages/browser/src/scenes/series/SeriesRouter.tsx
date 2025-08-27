import { UserPermission } from '@stump/graphql'
import { lazy, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'
import { useAppContext } from '@/context'

import SeriesLayout from './SeriesLayout.tsx'

const SeriesBooksScene = lazy(() => import('./tabs/books/SeriesBooksScene.tsx'))
const SeriesSettingsScene = lazy(() => import('./tabs/settings/SeriesSettingsScene.tsx'))
const SeriesExplorerScene = lazy(() => import('./tabs/files/SeriesExplorerScene.tsx'))
const SeriesSearchScene = lazy(() => import('@/scenes/seriesSearch'))

export default function SeriesRouter() {
	const { checkPermission } = useAppContext()

	const canAccessExplorer = useMemo(
		() => checkPermission(UserPermission.FileExplorer),
		[checkPermission],
	)

	return (
		<Routes>
			<Route path="" element={<SeriesSearchScene />} />
			<Route path=":id/*" element={<SeriesLayout />}>
				<Route path="" element={<Navigate to="books" replace />} />
				<Route path="books" element={<SeriesBooksScene />} />
				{canAccessExplorer && <Route path="files" element={<SeriesExplorerScene />} />}
				<Route element={<ServerOwnerRouteWrapper />}>
					<Route path="settings" element={<SeriesSettingsScene />} />
				</Route>
			</Route>

			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
