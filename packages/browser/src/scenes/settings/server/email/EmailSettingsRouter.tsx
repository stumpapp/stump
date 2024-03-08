import React, { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

const EmailSettingsScene = lazy(() => import('./EmailSettingsScene.tsx'))
const CreateEmailerScene = lazy(() => import('./CreateEmailerScene.tsx'))

export default function EmailSettingsRouter() {
	return (
		<Suspense fallback={null}>
			<Routes>
				<Route path="" element={<EmailSettingsScene />} />
				<Route path="new" element={<CreateEmailerScene />} />
			</Routes>
		</Suspense>
	)
}
