import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'

import { AppSettingsRouter } from './app/index.ts'
import { ServerSettingsRouter } from './server/index.ts'
import SettingsLayout from './SettingsLayout.tsx'

/**
 * The main router for the settings scene(s). Mostly just a collection of nested routers
 */
export default function SettingsRouter() {
	return (
		<Routes>
			<Route element={<SettingsLayout />}>
				<Route path="" element={<Navigate to="app/account" replace />} />
				<Route path="app/*" element={<AppSettingsRouter />} />
				<Route path="server/*" element={<ServerOwnerRouteWrapper />}>
					<Route path="*" element={<ServerSettingsRouter />} />
				</Route>
				<Route path="*" element={<Navigate to="app/account" replace />} />
			</Route>
		</Routes>
	)
}
