import { UserPermission } from '@stump/graphql'
import { lazy, useEffect, useMemo } from 'react'
import { Route, Routes, useNavigate } from 'react-router'

import { useAppContext } from '@/context'

import { EmailSettingsRouter } from './email'
import { UsersRouter } from './users'

const GeneralServerSettingsScene = lazy(() => import('./general/GeneralServerSettingsScene.tsx'))
const ServerLogsScene = lazy(() => import('./logs/ServerLogsScene.tsx'))
const JobSettingsScene = lazy(() => import('./jobs/JobSettingsScene.tsx'))

export default function ServerSettingsRouter() {
	const navigate = useNavigate()

	const { checkPermission } = useAppContext()

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

	const hasAtLeastOnePermission = canManageServer || canManageUsers || canManageEmail
	useEffect(() => {
		if (!hasAtLeastOnePermission) {
			navigate('/settings', { replace: true })
		}
	}, [hasAtLeastOnePermission, navigate])

	if (!hasAtLeastOnePermission) {
		return null
	}

	return (
		<Routes>
			{canManageServer && <Route path="general" element={<GeneralServerSettingsScene />} />}
			{canManageServer && <Route path="logs" element={<ServerLogsScene />} />}
			{canManageServer && <Route path="jobs" element={<JobSettingsScene />} />}
			{canManageUsers && <Route path="users/*" element={<UsersRouter />} />}
			{canManageEmail && <Route path="email/*" element={<EmailSettingsRouter />} />}
		</Routes>
	)
}
