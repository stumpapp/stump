import { UserPermission } from '@stump/graphql'
import { lazy, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'
import { useAppStore } from '@/stores/app.ts'

import EmailSettingsRouter from './server/email/EmailSettingsRouter.tsx'
import UsersRouter from './server/users/UsersRouter.tsx'
import SettingsLayout from './SettingsLayout.tsx'

const GeneralSettingsScene = lazy(() => import('./app/general/GeneralSettingsScene.tsx'))
const AppearanceSettingsScene = lazy(() => import('./app/preferences/AppearanceSettingsScene.jsx'))
const ReaderDefaultSettingsScene = lazy(() => import('./app/reader/ReaderDefaultSettingsScene.tsx'))
const DesktopSettingsScene = lazy(() => import('./app/desktop'))
const APIKeySettingsScene = lazy(() => import('./app/apiKeys'))

const GeneralServerSettingsScene = lazy(
	() => import('./server/general/GeneralServerSettingsScene.tsx'),
)
const ServerLogsScene = lazy(() => import('./server/logs/ServerLogsScene.tsx'))
const JobSettingsScene = lazy(() => import('./server/jobs/JobSettingsScene.tsx'))

/**
 * The main router for the settings scene(s). Mostly just a collection of nested routers
 */
export default function SettingsRouter() {
	const { checkPermission } = useAppContext()

	const isDesktop = useAppStore((store) => store.platform !== 'browser')
	const apiKeys = checkPermission(UserPermission.AccessApiKeys)

	const canManageServer = useMemo(
		() => checkPermission(UserPermission.ManageServer),
		[checkPermission],
	)
	const canManageUsers = useMemo(
		() => checkPermission(UserPermission.ManageUsers),
		[checkPermission],
	)
	const canManageEmail = useMemo(
		() => checkPermission(UserPermission.EmailerManage),
		[checkPermission],
	)

	return (
		<Routes>
			<Route element={<SettingsLayout />}>
				<Route path="" element={<Navigate to="app/account" replace />} />

				<Route path="account" element={<GeneralSettingsScene />} />
				<Route path="preferences" element={<AppearanceSettingsScene />} />
				<Route path="reader" element={<ReaderDefaultSettingsScene />} />
				{apiKeys && <Route path="api-keys" element={<APIKeySettingsScene />} />}
				{isDesktop && <Route path="desktop" element={<DesktopSettingsScene />} />}

				{canManageServer && <Route path="server" element={<GeneralServerSettingsScene />} />}
				{canManageServer && <Route path="logs" element={<ServerLogsScene />} />}
				{canManageServer && <Route path="jobs" element={<JobSettingsScene />} />}
				{canManageUsers && <Route path="users/*" element={<UsersRouter />} />}
				{canManageEmail && <Route path="email/*" element={<EmailSettingsRouter />} />}

				<Route path="*" element={<Navigate to="account" replace />} />
			</Route>
		</Routes>
	)
}
