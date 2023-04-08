import { Outlet } from 'react-router'

import SceneContainer from '../../../components/SceneContainer'
import LibraryAdminSideBar from './LibraryAdminSideBar'

/**
 *  Component that renders the layout for the library admin pages. This includes:
 *
 * - Creating a new library
 * - Updating an existing library
 */
export default function LibraryAdminLayout() {
	return (
		<div className="flex h-full w-full items-start justify-start">
			<LibraryAdminSideBar />
			<SceneContainer className="flex min-h-full w-full flex-grow flex-col space-y-6 lg:ml-[12.5rem]">
				<Outlet />
			</SceneContainer>
		</div>
	)
}
