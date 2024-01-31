import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'

import { LazyComponent } from '../../AppRouter.tsx'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const SeriesOverviewScene = lazily(() => import('./SeriesOverviewScene.tsx'))
const SeriesManagementScene = lazily(() => import('./management/SeriesManagementScene.tsx'))

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
