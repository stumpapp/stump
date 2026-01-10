import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { CreateOrUpdateLibraryInput, graphql } from '@stump/graphql'
import { handleApiError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import {
	CreateOrUpdateLibrarySchema,
	intoThumbnailConfig,
} from '@/components/library/createOrUpdate'
import { SteppedFormContext } from '@/components/steppedForm'
import SteppedFormSceneHeader from '@/components/steppedForm/SteppedFormSceneHeader'
import { useConfetti } from '@/hooks/useConfetti'
import paths from '@/paths'

import CreateLibraryForm from './CreateLibraryForm'

const query = graphql(`
	query CreateLibrarySceneExistingLibraries {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				path
			}
		}
	}
`)

const mutation = graphql(`
	mutation CreateLibrarySceneCreateLibrary($input: CreateOrUpdateLibraryInput!) {
		createLibrary(input: $input) {
			id
		}
	}
`)

export default function CreateLibraryScene() {
	const navigate = useNavigate()
	const { sdk } = useSDK()
	const client = useQueryClient()
	const { start: startConfetti } = useConfetti({ duration: 5000 })
	const {
		data: {
			libraries: { nodes: libraries },
		},
	} = useSuspenseGraphQL(query, [sdk.cacheKeys.libraryCreateLibraryQuery])

	const {
		mutate: createLibrary,
		isPending,
		error,
	} = useGraphQLMutation(mutation, {
		mutationKey: [sdk.cacheKeys.libraryCreate],
		onSuccess: ({ createLibrary: { id } }) => {
			navigate(paths.librarySeries(id))
			startConfetti()
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.libraries] })
		},
	})
	const createError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	const [formStep, setFormStep] = useState(1)
	/**
	 * A function which will handle the submission of the form, creating a new library
	 * provided the form values. Note the transformation of certain values.
	 */
	const handleSubmit = useCallback(
		(values: CreateOrUpdateLibrarySchema) => {
			const {
				name,
				path,
				description,
				tags,
				scanAfterPersist,
				ignoreRules,
				thumbnailConfig,
				...config
			} = values

			const input: CreateOrUpdateLibraryInput = {
				config: {
					...config,
					ignoreRules: ignoreRules.map(({ glob }) => glob),
					thumbnailConfig: intoThumbnailConfig(thumbnailConfig),
				} as CreateOrUpdateLibraryInput['config'],
				description,
				name,
				path,
				scanAfterPersist,
				tags: tags?.map(({ label }) => label).filter(Boolean),
			}

			createLibrary({ input })
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

	return (
		<div className="relative flex flex-1 flex-col">
			<SteppedFormContext.Provider
				value={{
					currentStep: formStep,
					localeBase: 'createLibraryScene',
					setStep: setFormStep,
					stepsBeforeReview: 3,
				}}
			>
				<SteppedFormSceneHeader />

				<SceneContainer>
					<div className="flex flex-col gap-12">
						{createError && (
							<Alert variant="destructive">
								<AlertCircle />
								<AlertTitle>Failed to create library</AlertTitle>
								<AlertDescription>{createError}</AlertDescription>
							</Alert>
						)}

						{libraries && (
							<CreateLibraryForm
								existingLibraries={libraries}
								onSubmit={handleSubmit}
								isLoading={isPending}
							/>
						)}
					</div>
				</SceneContainer>
			</SteppedFormContext.Provider>
		</div>
	)
}
