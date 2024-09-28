import { useUpdateLibrary } from '@stump/client'
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
const LibraryAnalysisScene = React.lazy(() => import('./options/analysis'))
const LibraryReadingDefaultsScene = React.lazy(() => import('./options/readingDefaults'))

const AccessControlScene = React.lazy(() => import('./danger/accessControl'))
const DeletionScene = React.lazy(() => import('./danger/deletion'))

// Note: library:manage permission is enforced in the parent router
export default function LibrarySettingsRouter() {
	const { library } = useLibraryContext()

	const { editLibrary } = useUpdateLibrary({
		id: library.id,
	})

	// TODO: This is particularly fallible. It would be a lot wiser to eventually just.. yknow, literally
	// implement a patch endpoint lol. I'm being very lazy but I'll get to it. I'm tired!
	/**
	 * A pseudo-patch function which will update the library, mixing what is present in the cache
	 * with the updates provided.
	 */
	const patch = useCallback(
		(updates: Partial<UpdateLibrary>) => {
			const payload: UpdateLibrary = {
				...library,
				...updates,
				config: updates.config ? { ...library.config, ...updates.config } : library.config,
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

				<Route path="reading" element={<LibraryReadingDefaultsScene />} />
				<Route path="scanning" element={<ScannerBehaviorScene />} />
				<Route path="thumbnails" element={<ThumbnailSettingsScene />} />
				<Route path="analysis" element={<LibraryAnalysisScene />} />

				<Route path="" element={<Navigate to="access-control" replace />} />
				<Route path="access-control" element={<AccessControlScene />} />
				<Route path="delete" element={<DeletionScene />} />
			</Routes>
		</LibraryManagementContext.Provider>
	)
}
