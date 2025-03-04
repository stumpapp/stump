import { queryClient, useScanLibrary, useSDK, useUpdateLibrary } from '@stump/client'
import { ScanOptions, UpdateLibrary } from '@stump/sdk'
import { lazy, Suspense, useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useAppContext } from '@/context'

import { useLibraryContext } from '../../context'
import { LibraryManagementContext } from './context'

const BasicSettingsScene = lazy(() => import('./basics/BasicSettingsScene'))
const ThumbnailSettingsScene = lazy(() => import('./options/thumbnails/ThumbnailSettingsScene'))
const ScannerBehaviorScene = lazy(() => import('./options/scanner'))
const LibraryAnalysisScene = lazy(() => import('./options/analysis'))
const LibraryReadingDefaultsScene = lazy(() => import('./options/readingDefaults'))

const AccessControlScene = lazy(() => import('./danger/accessControl'))
const DeletionScene = lazy(() => import('./danger/deletion'))

// Note: library:manage permission is enforced in the parent router
export default function LibrarySettingsRouter() {
	const { checkPermission } = useAppContext()
	const { library } = useLibraryContext()
	const { sdk } = useSDK()
	const { editLibrary } = useUpdateLibrary({
		id: library.id,
		onSuccess: async ({ id }) => {
			await queryClient.refetchQueries([sdk.library.keys.getByID, id], { exact: false })
		},
	})

	const { scan } = useScanLibrary()
	const scanLibrary = useCallback(
		(options: ScanOptions = {}) => scan({ id: library.id, ...options }),
		[library.id, scan],
	)

	const canScan = checkPermission('library:scan')

	// TODO: This is particularly fallible. It would be a lot wiser to eventually just.. y'know, literally
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
				scan: canScan ? scanLibrary : undefined,
			}}
		>
			<Suspense>
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
			</Suspense>
		</LibraryManagementContext.Provider>
	)
}
