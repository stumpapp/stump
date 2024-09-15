import React, { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppStore } from '@/stores'

const GeneralSettingsScene = lazy(() => import('./general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazy(() => import('./appearance/AppearanceSettingsScene.tsx'))
const ReaderDefaultSettingsScene = lazy(() => import('./reader/ReaderDefaultSettingsScene.tsx'))
const DesktopSettingsScene = lazy(() => import('./desktop'))

export default function AppSettingsRouter() {
	const isDesktop = useAppStore((store) => store.platform !== 'browser')

	return (
		<Routes>
			<Route path="account" element={<GeneralSettingsScene />} />
			<Route path="appearance" element={<AppearanceSettingsScene />} />
			<Route path="reader" element={<ReaderDefaultSettingsScene />} />
			{isDesktop && <Route path="desktop" element={<DesktopSettingsScene />} />}
			<Route path="*" element={<Navigate to="account" replace />} />
		</Routes>
	)
}
