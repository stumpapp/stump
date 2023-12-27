import React from 'react'
import { Route, Routes } from 'react-router'

import { LazyComponent } from '../../../AppRouter.tsx'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const GeneralSettingsScene = lazily(() => import('./general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazily(() => import('./appearance/AppearanceSettingsScene.tsx'))

export default function AppSettingsRouter() {
	return (
		<Routes>
			<Route path="general" element={<GeneralSettingsScene />} />
			<Route path="appearance" element={<AppearanceSettingsScene />} />
		</Routes>
	)
}
