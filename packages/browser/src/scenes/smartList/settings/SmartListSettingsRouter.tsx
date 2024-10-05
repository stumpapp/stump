import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

const BasicSettingsScene = React.lazy(() => import('./basics'))
const AccessSettingsScene = React.lazy(() => import('./access'))
const FiltersSettingsScene = React.lazy(() => import('./filters'))
const DangerSettingsScene = React.lazy(() => import('./danger'))

export default function SmartListSettingsRouter() {
	// TODO: setup patch request stuff

	return (
		<Suspense>
			<Routes>
				<Route path="" element={<Navigate to="basics" replace />} />
				<Route path="basics" element={<BasicSettingsScene />} />
				<Route path="access" element={<AccessSettingsScene />} />
				<Route path="filters" element={<FiltersSettingsScene />} />
				<Route path="danger" element={<DangerSettingsScene />} />
			</Routes>
		</Suspense>
	)
}
