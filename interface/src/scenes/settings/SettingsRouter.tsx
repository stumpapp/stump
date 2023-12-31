import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'

import { AppSettingsRouter } from './app'
import { ServerSettingsRouter } from './server'
import SettingsLayout from './SettingsLayout.tsx'

export default function SettingsRouter() {
	return (
		<Routes>
			<Route element={<SettingsLayout />}>
				<Route path="" element={<Navigate to="app/general" replace />} />
				<Route path="app/*" element={<AppSettingsRouter />} />
				<Route path="server/*" element={<ServerOwnerRouteWrapper />}>
					<Route path="*" element={<ServerSettingsRouter />} />
				</Route>

				{/* <Route path="" element={<Navigate to="/settings/general" replace />} />
				<Route path="general" element={<GeneralSettingsScene />} />
				<Route path="users/*" element={<ServerOwnerRouteWrapper />}>
					<Route path="*" element={<UserManagementRouter />} />
				</Route>
				<Route path="server" element={<ServerOwnerRouteWrapper />}>
					<Route path="" element={<ServerSettingsScene />} />
				</Route>
				<Route path="jobs" element={<ServerOwnerRouteWrapper />}>
					<Route path="" element={<JobSettingsScene />} />
				</Route>
				 */}
			</Route>
		</Routes>
	)
}
