import React, { lazy } from 'react'
import { Route, Routes } from 'react-router'

const GeneralSettingsScene = lazy(() => import('./general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazy(() => import('./appearance/AppearanceSettingsScene.tsx'))

export default function AppSettingsRouter() {
	return (
		<Routes>
			<Route path="general" element={<GeneralSettingsScene />} />
			<Route path="appearance" element={<AppearanceSettingsScene />} />
		</Routes>
	)
}
