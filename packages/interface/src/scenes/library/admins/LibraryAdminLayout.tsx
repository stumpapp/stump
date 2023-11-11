import { Navigate, Outlet } from 'react-router'

import SceneContainer from '@/components/SceneContainer'

import { useAppContext } from '../../../context'

/**
 *  Component that renders the layout for the library admin pages. This includes:
 *
 * - Creating a new library
 * - Updating an existing library
 */
export default function LibraryAdminLayout() {
	const { isServerOwner } = useAppContext()

	if (!isServerOwner) {
		return <Navigate to=".." replace />
	}

	return (
		<div className="flex h-full w-full items-start justify-start">
			<SceneContainer className="flex min-h-full w-full flex-grow flex-col space-y-6">
				<Outlet />
			</SceneContainer>
		</div>
	)
}
