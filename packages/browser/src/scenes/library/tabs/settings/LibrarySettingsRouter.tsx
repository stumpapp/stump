import { useGraphQLMutation } from '@stump/client'
import { CreateOrUpdateLibraryInput, graphql, useFragment, UserPermission } from '@stump/graphql'
import { ScanOptions } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import omit from 'lodash/omit'
import pick from 'lodash/pick'
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

export const LibrarySettingsConfig = graphql(`
	fragment LibrarySettingsConfig on Library {
		config {
			id
			convertRarToZip
			hardDeleteConversions
			defaultReadingDir
			defaultReadingMode
			defaultReadingImageScaleFit
			generateFileHashes
			generateKoreaderHashes
			processMetadata
			watch
			libraryPattern
			thumbnailConfig {
				__typename
				resizeMethod {
					__typename
					... on ScaleEvenlyByFactor {
						factor
					}
					... on ExactDimensionResize {
						width
						height
					}
					... on ScaledDimensionResize {
						dimension
						size
					}
				}
				format
				quality
				page
			}
			ignoreRules
		}
	}
`)

const editMutation = graphql(`
	mutation LibrarySettingsRouterEditLibraryMutation($id: ID!, $input: CreateOrUpdateLibraryInput!) {
		updateLibrary(id: $id, input: $input) {
			id
		}
	}
`)

const scanMutation = graphql(`
	mutation LibrarySettingsRouterScanLibraryMutation($id: ID!, $options: JSON) {
		scanLibrary(id: $id, options: $options)
	}
`)

// Note: library:manage permission is enforced in the parent router
export default function LibrarySettingsRouter() {
	const { checkPermission } = useAppContext()
	const { library } = useLibraryContext()
	const { config } = useFragment(LibrarySettingsConfig, library)

	const client = useQueryClient()

	const { mutate: editLibrary } = useGraphQLMutation(editMutation, {
		onSuccess: async () => {
			client.invalidateQueries({
				predicate: ({ queryKey }) =>
					queryKey.some(
						(key) =>
							typeof key === 'string' &&
							[
								'libraryById',
								// sdk.job.keys.get,
								// sdk.library.keys.getByID,
							].includes(key),
					),
			})
		},
	})

	const { mutate: scan } = useGraphQLMutation(scanMutation)

	const scanLibrary = useCallback(
		(options?: ScanOptions) => scan({ id: library.id, options }),
		[library.id, scan],
	)

	const canScan = checkPermission(UserPermission.ScanLibrary)

	// TODO: This is particularly fallible. It would be a lot wiser to eventually just.. y'know, literally
	// implement a patch endpoint lol. I'm being very lazy but I'll get to it. I'm tired!
	/**
	 * A pseudo-patch function which will update the library, mixing what is present in the cache
	 * with the updates provided.
	 */
	const patch = useCallback(
		(updates: Partial<CreateOrUpdateLibraryInput>) => {
			const configWithoutId = omit(
				updates.config ? { ...config, ...updates.config } : config,
				'id',
			) as CreateOrUpdateLibraryInput['config']
			const payload = {
				// Note: pick returns a deep partial for whatever reason, so we cast it. This should be safe
				...(pick(library, ['name', 'description', 'emoji', 'path']) as typeof library),
				...updates,
				config: configWithoutId,
				tags: updates.tags ? updates.tags : library?.tags?.map(({ name }) => name),
			} satisfies CreateOrUpdateLibraryInput
			editLibrary({ id: library.id, input: payload })
		},
		[editLibrary, library, config],
	)

	return (
		<LibraryManagementContext.Provider
			value={{
				library: {
					...library,
					config,
				},
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
