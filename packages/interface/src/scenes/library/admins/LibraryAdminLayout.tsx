import { Outlet } from 'react-router'

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
			<div className="flex h-full w-full flex-col space-y-6 p-4">
				<Outlet />
			</div>
		</div>
	)
}
