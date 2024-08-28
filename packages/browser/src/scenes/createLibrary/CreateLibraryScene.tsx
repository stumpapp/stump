import { handleApiError } from '@stump/api'
import { useCreateLibraryMutation, useLibraries } from '@stump/client'
import { Alert } from '@stump/components'
import { CreateLibrary } from '@stump/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { CreateLibraryForm, CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { useConfetti } from '@/hooks/useConfetti'
import paths from '@/paths'

import { CreateLibraryContext } from './context'
import CreateLibraryHeader from './CreateLibraryHeader'

export default function CreateLibraryScene() {
	const navigate = useNavigate()
	const { start: startConfetti } = useConfetti({ duration: 5000 })

	const { libraries } = useLibraries({ suspense: true })
	const { createLibrary, isLoading, error } = useCreateLibraryMutation({
		onSuccess: ({ id }) => {
			navigate(paths.librarySeries(id))
			startConfetti()
		},
	})
	const createError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	const [formStep, setFormStep] = useState(1)

	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			const { name, path, description, tags, scan_mode, ignore_rules, ...options } = values

			const payload: CreateLibrary = {
				description,
				library_options: {
					...options,
					ignore_rules: ignore_rules.map(({ glob }) => glob),
					thumbnail_config:
						options.thumbnail_config.enabled && !!options.thumbnail_config.resize_options
							? options.thumbnail_config
							: null,
				},
				name,
				path,
				scan_mode,
				tags: tags?.map(({ label }) => label),
			}

			createLibrary(payload)
		},
		[createLibrary],
	)

	/**
	 * An effect to scroll to the top of the page if there is an error,
	 * since the form is rather long and the error will render at the top
	 */
	useEffect(() => {
		if (createError) {
			window.scrollTo({ behavior: 'smooth', top: 0 })
		}
	}, [createError])

	// TODO: this layout is likely incorrect...
	return (
		<div className="relative flex flex-1 flex-col">
			<CreateLibraryContext.Provider
				value={{
					formStep,
					setStep: setFormStep,
				}}
			>
				<CreateLibraryHeader />

				<SceneContainer>
					<div className="flex flex-col gap-12">
						{createError && <Alert level="error">{createError}</Alert>}

						{libraries && (
							<CreateLibraryForm
								existingLibraries={libraries}
								onSubmit={handleSubmit}
								isLoading={isLoading}
							/>
						)}
					</div>
				</SceneContainer>
			</CreateLibraryContext.Provider>
		</div>
	)
}
