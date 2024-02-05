import React from 'react'
import { Route, Routes } from 'react-router'

import { LazyComponent } from '../../../AppRouter.tsx'
import { UsersRouter } from './users'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const GeneralServerSettingsScene = lazily(() => import('./general/GeneralServerSettingsScene.tsx'))
const ServerLogsScene = lazily(() => import('./logs/ServerLogsScene.tsx'))
const JobSettingsScene = lazily(() => import('./jobs/JobSettingsScene.tsx'))

export default function ServerSettingsRouter() {
	return (
		<Routes>
			<Route path="general" element={<GeneralServerSettingsScene />} />
			<Route path="logs" element={<ServerLogsScene />} />
			<Route path="jobs" element={<JobSettingsScene />} />
			<Route path="users/*" element={<UsersRouter />} />
		</Routes>
	)
}
