import { handleApiError } from '@stump/api'
import { useCreateLibraryMutation, useLibraries } from '@stump/client'
import { Alert, Heading, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { CreateLibrary } from '@stump/types'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'

import paths from '@/paths'

export default function CreateLibraryScene() {
	return null
	// const navigate = useNavigate()

	// const { t } = useLocaleContext()
	// const { libraries } = useLibraries({ suspense: true })

	// const { createLibrary, isLoading, error } = useCreateLibraryMutation({
	// 	onSuccess: () => {
	// 		navigate(paths.home())
	// 	},
	// })
	// const createError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	// const handleSubmit = useCallback(
	// 	(values: CreateOrUpdateLibrarySchema) => {
	// 		const { name, path, description, tags, scan_mode, ignore_rules, ...options } = values

	// 		const payload: CreateLibrary = {
	// 			description,
	// 			library_options: {
	// 				...options,
	// 				ignore_rules: ignore_rules.map(({ glob }) => glob),
	// 			},
	// 			name,
	// 			path,
	// 			scan_mode,
	// 			tags: tags?.map(({ value }) => value),
	// 		}

	// 		createLibrary(payload)
	// 	},
	// 	[createLibrary],
	// )

	// /**
	//  * An effect to scroll to the top of the page if there is an error,
	//  * since the form is rather long and the error will render at the top
	//  */
	// useEffect(() => {
	// 	if (createError) {
	// 		window.scrollTo({ behavior: 'smooth', top: 0 })
	// 	}
	// }, [createError])

	// return (
	// 	<>
	// 		<header>
	// 			<Heading size="lg" className="font-bold">
	// 				{t('createLibraryScene.heading')}
	// 			</Heading>
	// 			<Text size="sm" variant="muted" className="mt-1.5">
	// 				{t('createLibraryScene.subtitle')}{' '}
	// 				<Link href="https://stumpapp.dev/guides/basics/libraries">
	// 					{t('createLibraryScene.subtitleLink')}.
	// 				</Link>
	// 			</Text>
	// 		</header>
	// 		<div className="flex flex-col gap-12">
	// 			{createError && <Alert level="error">{createError}</Alert>}

	// 			{libraries && (
	// 				<CreateOrUpdateLibraryForm
	// 					existingLibraries={libraries}
	// 					onSubmit={handleSubmit}
	// 					isLoading={isLoading}
	// 				/>
	// 			)}
	// 		</div>
	// 	</>
	// )
}
