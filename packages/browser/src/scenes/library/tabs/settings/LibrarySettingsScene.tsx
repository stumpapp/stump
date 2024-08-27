import { handleApiError, libraryQueryKeys } from '@stump/api'
import { invalidateQueries, useEditLibraryMutation, useLibraries } from '@stump/client'
import { Alert } from '@stump/components'
import { UpdateLibrary } from '@stump/types'
import { useCallback, useEffect, useMemo } from 'react'

import { Container, ContentContainer } from '@/components/container'

import { useLibraryContext } from '../../context'
import LibraryExclusions from './danger/accessControl/LibraryExclusions'
import DangerZone from './danger/deletion/DangerZone'
import QuickActions from './QuickActions'

// TODO: redesign this page, it is ugly!!!!!!!!!

export default function LibrarySettingsScene() {
	// const { library } = useLibraryContext()
	// const { libraries } = useLibraries()

	// const { editLibrary, isLoading, error } = useEditLibraryMutation({
	// 	onSuccess: async () => {
	// 		await invalidateQueries({ exact: false, keys: [libraryQueryKeys.getLibraryById] })
	// 	},
	// })
	// const updateError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	return null

	// const handleSubmit = useCallback(
	// 	(values: CreateOrUpdateLibrarySchema) => {
	// 		const { name, path, description, tags, scan_mode, ignore_rules, ...options } = values

	// 		const payload: UpdateLibrary = {
	// 			...library,
	// 			description,
	// 			library_options: {
	// 				id: library.library_options.id,
	// 				...options,
	// 				ignore_rules: ignore_rules.map(({ glob }) => glob),
	// 			},
	// 			name,
	// 			path,
	// 			scan_mode,
	// 			tags: tags?.map(({ value }) => value),
	// 		}

	// 		editLibrary(payload)
	// 	},
	// 	[editLibrary, library],
	// )

	// /**
	//  * An effect to scroll to the top of the page if there is an error,
	//  * since the form is rather long and the error will render at the top
	//  */
	// useEffect(() => {
	// 	if (updateError) {
	// 		window.scrollTo({ behavior: 'smooth', top: 0 })
	// 	}
	// }, [updateError])

	// return (
	// 	<Container disableHorizontalPadding>
	// 		<ContentContainer className="mt-0">
	// 			{updateError && <Alert level="error">{updateError}</Alert>}

	// 			{libraries && (
	// 				<>
	// 					<CreateOrUpdateLibraryForm
	// 						existingLibraries={libraries}
	// 						library={library}
	// 						onSubmit={handleSubmit}
	// 						isLoading={isLoading}
	// 					/>
	// 					<LibraryExclusions />
	// 					<QuickActions />
	// 					<DangerZone />
	// 				</>
	// 			)}
	// 		</ContentContainer>
	// 	</Container>
	// )
}
