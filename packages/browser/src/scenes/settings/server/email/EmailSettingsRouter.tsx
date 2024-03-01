import React, { lazy } from 'react'
import { Route, Routes } from 'react-router'

const EmailSettingsScene = lazy(() => import('./EmailSettingsScene.tsx'))
const CreateEmailerScene = lazy(() => import('./CreateEmailerScene.tsx'))

export default function EmailSettingsRouter() {
	return (
		<Routes>
			<Route path="" element={<EmailSettingsScene />} />
			<Route path="new" element={<CreateEmailerScene />} />
		</Routes>
	)
}
