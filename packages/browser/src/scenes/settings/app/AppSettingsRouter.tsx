import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppStore } from '@/stores'
import { useAppContext } from '@/context'

const GeneralSettingsScene = lazy(() => import('./general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazy(() => import('./appearance/AppearanceSettingsScene.tsx'))
const ReaderDefaultSettingsScene = lazy(() => import('./reader/ReaderDefaultSettingsScene.tsx'))
const DesktopSettingsScene = lazy(() => import('./desktop'))
const APIKeySettingsScene = lazy(() => import('./apiKeys'))

export default function AppSettingsRouter() {
	const { checkPermission } = useAppContext()

	const isDesktop = useAppStore((store) => store.platform !== 'browser')
	const apiKeys = checkPermission('feature:api_keys')

	return (
		<Routes>
			<Route path="account" element={<GeneralSettingsScene />} />
			<Route path="appearance" element={<AppearanceSettingsScene />} />
			<Route path="reader" element={<ReaderDefaultSettingsScene />} />
			{apiKeys && <Route path="api-keys" element={<APIKeySettingsScene />} />}
			{isDesktop && <Route path="desktop" element={<DesktopSettingsScene />} />}
			<Route path="*" element={<Navigate to="account" replace />} />
		</Routes>
	)
}
