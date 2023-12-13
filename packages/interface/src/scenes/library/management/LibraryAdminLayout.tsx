import { useEffect, useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router'

import SceneContainer from '@/components/SceneContainer'
import { useAppContext } from '@/context'

/**
 *  Component that renders the layout for the library admin pages. This includes:
 *
 * - Creating a new library
 * - Updating an existing library
 */
export default function LibraryAdminLayout() {
	const { checkPermission } = useAppContext()

	const navigate = useNavigate()
	const canManage = useMemo(() => checkPermission('library:manage'), [checkPermission])
	useEffect(() => {
		if (!canManage) {
			navigate('..')
		}
	}, [canManage, navigate])

	if (!canManage) {
		return null
	}

	return (
		<div className="flex h-full w-full items-start justify-start">
			<SceneContainer className="flex min-h-full w-full flex-grow flex-col space-y-6">
				<Outlet />
			</SceneContainer>
		</div>
	)
}
