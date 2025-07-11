import { UserPermission } from '@stump/graphql'
import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router'

import { useAppContext } from '@/context'

import { EmailerSettingsContext } from './context.ts'

const EmailSettingsScene = lazy(() => import('./EmailSettingsScene.tsx'))
const CreateEmailerScene = lazy(() => import('./CreateEmailerScene.tsx'))
const EditEmailerScene = lazy(() => import('./EditEmailerScene.tsx'))

export default function EmailSettingsRouter() {
	const navigate = useNavigate()

	const { checkPermission } = useAppContext()

	const canEdit = checkPermission(UserPermission.EmailerManage)
	const canCreate = checkPermission(UserPermission.EmailerCreate)
	const canView = checkPermission(UserPermission.EmailerRead)

	useEffect(() => {
		if (!canView) {
			navigate('..', { replace: true })
		}
	}, [canView, navigate])

	if (!canView) return null

	return (
		<EmailerSettingsContext.Provider
			// TODO: separate permission for delete?
			value={{ canCreateEmailer: canCreate, canDeleteEmailer: canEdit, canEditEmailer: canEdit }}
		>
			<Suspense fallback={null}>
				<Routes>
					<Route path="" element={<EmailSettingsScene />} />
					{canCreate && <Route path="new" element={<CreateEmailerScene />} />}
					{canEdit && <Route path=":id/edit" element={<EditEmailerScene />} />}
				</Routes>
			</Suspense>
		</EmailerSettingsContext.Provider>
	)
}
