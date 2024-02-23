import React, { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'

import SeriesLayout from './SeriesLayout.tsx'

const SeriesBooksScene = lazy(() => import('./SeriesBooksScene.tsx'))
const SeriesSettingsScene = lazy(() => import('./management/SeriesSettingsScene.tsx'))

export default function SeriesRouter() {
	// const { checkPermission } = useAppContext()
	// const canAccessExplorer = useMemo(() => checkPermission('file:explorer'), [checkPermission])

	return (
		<Routes>
			<Route path=":id/*" element={<SeriesLayout />}>
				<Route path="" element={<Navigate to="books" replace />} />
				<Route path="books" element={<SeriesBooksScene />} />
				<Route element={<ServerOwnerRouteWrapper />}>
					<Route path="settings" element={<SeriesSettingsScene />} />
				</Route>
			</Route>

			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
