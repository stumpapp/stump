import { useAppProps } from '@stump/client'
import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'
import SettingsLayout from './SettingsLayout'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)
const GeneralSettingsScene = lazily(() => import('./general/GeneralSettingsScene'))
const JobSettingsScene = lazily(() => import('./job/JobSettingsScene'))
const ServerSettingsScene = lazily(() => import('./server/ServerSettingsScene'))
const UserSettingsScene = lazily(() => import('./user/UserSettingsScene'))

export default function SettingsRouter() {
	const appProps = useAppProps()

	return (
		<Routes>
			<Route element={<SettingsLayout />}>
				<Route path="" element={<Navigate to="/settings/general" replace />} />
				<Route path="general" element={<GeneralSettingsScene />} />
				<Route path="users" element={<UserSettingsScene />} />
				<Route path="server" element={<ServerSettingsScene />} />
				<Route path="jobs" element={<JobSettingsScene />} />
				{appProps?.platform !== 'browser' && <Route path="desktop" element={<>Desktop!</>} />}
			</Route>
		</Routes>
	)
}
