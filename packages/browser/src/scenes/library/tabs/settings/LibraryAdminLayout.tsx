import { UserPermission } from '@stump/graphql'
import { Suspense, useEffect, useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { useAppContext } from '@/context'

type Props = {
	applySceneDefaults?: boolean
}

/**
 *  Component that renders the layout for the library admin pages. This includes:
 */
export default function LibraryAdminLayout({ applySceneDefaults = true }: Props) {
	const { checkPermission } = useAppContext()

	const navigate = useNavigate()
	const canManage = useMemo(() => checkPermission(UserPermission.ManageLibrary), [checkPermission])
	useEffect(() => {
		if (!canManage) {
			navigate('..')
		}
	}, [canManage, navigate])

	if (!canManage) {
		return null
	}

	const renderInner = () => {
		if (applySceneDefaults) {
			return (
				<SceneContainer className="space-y-6 max-w-4xl flex min-h-full w-full grow flex-col">
					<Suspense>
						<Outlet />
					</Suspense>
				</SceneContainer>
			)
		} else {
			return (
				<Suspense>
					<Outlet />
				</Suspense>
			)
		}
	}

	return <div className="flex h-full w-full items-start justify-start">{renderInner()}</div>
}
