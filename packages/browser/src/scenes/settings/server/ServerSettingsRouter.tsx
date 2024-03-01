import React, { lazy } from 'react'
import { Route, Routes } from 'react-router'

import { EmailSettingsRouter } from './email'
import { UsersRouter } from './users'

const GeneralServerSettingsScene = lazy(() => import('./general/GeneralServerSettingsScene.tsx'))
const ServerLogsScene = lazy(() => import('./logs/ServerLogsScene.tsx'))
const JobSettingsScene = lazy(() => import('./jobs/JobSettingsScene.tsx'))

export default function ServerSettingsRouter() {
	return (
		<Routes>
			<Route path="general" element={<GeneralServerSettingsScene />} />
			<Route path="logs" element={<ServerLogsScene />} />
			<Route path="jobs" element={<JobSettingsScene />} />
			<Route path="users/*" element={<UsersRouter />} />
			<Route path="email/*" element={<EmailSettingsRouter />} />
		</Routes>
	)
}
