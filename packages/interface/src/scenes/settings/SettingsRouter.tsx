import { useAppProps } from '@stump/client'
import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'
import ServerOwnerRouteWrapper from '../../components/ServerOwnerRouteWrapper.tsx'
import SettingsLayout from './SettingsLayout'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const GeneralSettingsScene = lazily(() => import('./general/GeneralSettingsScene.tsx'))
const JobSettingsScene = lazily(() => import('./job/JobSettingsScene.tsx'))
const ServerSettingsScene = lazily(() => import('./server/ServerSettingsScene.tsx'))
const UserManagementScene = lazily(() => import('./user/UserManagementScene.tsx'))
const DesktopSettingsScene = lazily(() => import('./desktop/DesktopSettingsScene.tsx'))

export default function SettingsRouter() {
	const appProps = useAppProps()

	return (
		<Routes>
			<Route element={<SettingsLayout />}>
				<Route path="" element={<Navigate to="/settings/general" replace />} />
				<Route path="general" element={<GeneralSettingsScene />} />
				<Route path="users" element={<ServerOwnerRouteWrapper />}>
					<Route path="" element={<UserManagementScene />} />
				</Route>
				<Route path="server" element={<ServerOwnerRouteWrapper />}>
					<Route path="" element={<ServerSettingsScene />} />
				</Route>
				<Route path="jobs" element={<ServerOwnerRouteWrapper />}>
					<Route path="" element={<JobSettingsScene />} />
				</Route>
				{appProps?.platform !== 'browser' && (
					<Route path="desktop" element={<DesktopSettingsScene />} />
				)}
			</Route>
		</Routes>
	)
}
