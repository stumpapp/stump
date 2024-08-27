import { libraryQueryKeys } from '@stump/api'
import { invalidateQueries, useEditLibraryMutation } from '@stump/client'
import { UpdateLibrary } from '@stump/types'
import React, { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useLibraryContext } from '../../context'
import { LibraryManagementContext } from './context'

const BasicSettingsScene = React.lazy(() => import('./basics/BasicSettingsScene'))
const ThumbnailSettingsScene = React.lazy(() => import('./options/ThumbnailSettingsScene'))
const ScannerBehaviorScene = React.lazy(() => import('./options/ScannerBehaviorScene'))

const AccessControlScene = React.lazy(() => import('./danger/accessControl'))

export default function LibrarySettingsRouter() {
	const { library } = useLibraryContext()

	// TODO: do something with error OR change to promise and return in patch
	const { editLibrary } = useEditLibraryMutation({
		onSuccess: async () => {
			await invalidateQueries({ exact: false, keys: [libraryQueryKeys.getLibraryById] })
		},
	})

	// TODO: verify this works, I'm very skeptical removal of fields will fail
	const patch = useCallback(
		(updates: Partial<UpdateLibrary>) => {
			const payload: UpdateLibrary = {
				...library,
				...updates,
				library_options: updates.library_options
					? { ...library.library_options, ...updates.library_options }
					: library.library_options,
				tags: updates.tags ? updates.tags : library?.tags?.map(({ name }) => name),
			}
			editLibrary(payload)
		},
		[editLibrary, library],
	)

	return (
		<LibraryManagementContext.Provider
			value={{
				patch,
			}}
		>
			<Routes>
				<Route path="" element={<Navigate to="basics" replace />} />
				<Route path="basics" element={<BasicSettingsScene />} />

				<Route path="options/*">
					<Route path="" element={<Navigate to="scanning" replace />} />
					<Route path="scanning" element={<ScannerBehaviorScene />} />
					<Route path="thumbnails" element={<ThumbnailSettingsScene />} />
				</Route>

				<Route path="danger/*">
					<Route path="" element={<Navigate to="access-control" replace />} />
					<Route path="access-control" element={<AccessControlScene />} />
					<Route path="delete" element={<div>Delete</div>} />
				</Route>
			</Routes>
		</LibraryManagementContext.Provider>
	)
}
