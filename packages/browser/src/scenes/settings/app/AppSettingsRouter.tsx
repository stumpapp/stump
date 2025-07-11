import { UserPermission } from '@stump/graphql'
import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'
import { useAppStore } from '@/stores'

const GeneralSettingsScene = lazy(() => import('./general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazy(() => import('./appearance/AppearanceSettingsScene.tsx'))
const ReaderDefaultSettingsScene = lazy(() => import('./reader/ReaderDefaultSettingsScene.tsx'))
const DesktopSettingsScene = lazy(() => import('./desktop'))
const APIKeySettingsScene = lazy(() => import('./apiKeys'))

//  TODO: Add patch for user and user preferences update operations and shove in context

export default function AppSettingsRouter() {
	const { checkPermission } = useAppContext()

	const isDesktop = useAppStore((store) => store.platform !== 'browser')
	const apiKeys = checkPermission(UserPermission.AccessApiKeys)

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
