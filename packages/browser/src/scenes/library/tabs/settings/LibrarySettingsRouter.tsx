import { libraryQueryKeys } from '@stump/api'
import { invalidateQueries, useEditLibraryMutation } from '@stump/client'
import { UpdateLibrary } from '@stump/types'
import React, { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useLibraryContext } from '../../context'
import { LibraryManagementContext } from './context'

const BasicSettingsScene = React.lazy(() => import('./basics/BasicSettingsScene'))
const ThumbnailSettingsScene = React.lazy(
	() => import('./options/thumbnails/ThumbnailSettingsScene'),
)
const ScannerBehaviorScene = React.lazy(() => import('./options/ScannerBehaviorScene'))

const AccessControlScene = React.lazy(() => import('./danger/accessControl'))
const DeletionScene = React.lazy(() => import('./danger/deletion'))

// Note: library:manage permission is enforced in the parent router
export default function LibrarySettingsRouter() {
	const { library } = useLibraryContext()

	// TODO: do something with error OR change to promise and return in patch
	const { editLibrary } = useEditLibraryMutation({
		onSuccess: async () => {
			await invalidateQueries({ exact: false, keys: [libraryQueryKeys.getLibraryById] })
		},
	})

	// TODO: This is particularly fallible. It would be a lot wiser to eventually just.. yknow, literally
	// implement a patch endpoint lol. I'm being very lazy but I'll get to it. I'm tired!
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
					<Route path="delete" element={<DeletionScene />} />
				</Route>
			</Routes>
		</LibraryManagementContext.Provider>
	)
}
