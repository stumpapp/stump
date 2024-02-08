import React, { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'

const SeriesOverviewScene = lazy(() => import('./SeriesOverviewScene.tsx'))
const SeriesManagementScene = lazy(() => import('./management/SeriesManagementScene.tsx'))

export default function SeriesRouter() {
	return (
		<Routes>
			<Route path=":id" element={<SeriesOverviewScene />} />
			<Route path=":id/manage" element={<ServerOwnerRouteWrapper />}>
				<Route path="" element={<SeriesManagementScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
