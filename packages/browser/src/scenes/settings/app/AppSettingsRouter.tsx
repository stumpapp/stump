import React, { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

const GeneralSettingsScene = lazy(() => import('./general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazy(() => import('./appearance/AppearanceSettingsScene.tsx'))
const ReaderDefaultSettingsScene = lazy(() => import('./reader/ReaderDefaultSettingsScene.tsx'))

export default function AppSettingsRouter() {
	return (
		<Routes>
			<Route path="account" element={<GeneralSettingsScene />} />
			<Route path="appearance" element={<AppearanceSettingsScene />} />
			<Route path="reader" element={<ReaderDefaultSettingsScene />} />
			<Route path="*" element={<Navigate to="account" replace />} />
		</Routes>
	)
}
