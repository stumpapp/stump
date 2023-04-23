import { Library } from '@stump/types'
import { useState } from 'react'
import { Navigate, Outlet } from 'react-router'

import SceneContainer from '../../../components/SceneContainer'
import { useAppContext } from '../../../context'
import { LibraryAdminContext } from './context'
import LibraryAdminSideBar from './LibraryAdminSideBar'

/**
 *  Component that renders the layout for the library admin pages. This includes:
 *
 * - Creating a new library
 * - Updating an existing library
 */
export default function LibraryAdminLayout() {
	const [libraryPreview, setLibraryPreview] = useState<Partial<Library>>({})

	const { isServerOwner } = useAppContext()

	const syncLibraryPreview = (library: Partial<Library>) => {
		setLibraryPreview(library)
	}

	if (!isServerOwner) {
		return <Navigate to="/404" />
	}

	return (
		<LibraryAdminContext.Provider value={{ libraryPreview, syncLibraryPreview }}>
			<div className="flex h-full w-full items-start justify-start">
				<LibraryAdminSideBar />
				<SceneContainer className="flex min-h-full w-full flex-grow flex-col space-y-6 lg:ml-[14rem]">
					<Outlet />
				</SceneContainer>
			</div>
		</LibraryAdminContext.Provider>
	)
}
