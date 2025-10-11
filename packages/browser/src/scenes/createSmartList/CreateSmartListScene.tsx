import { useGraphQLMutation, useSDK } from '@stump/client'
import { Alert } from '@stump/components'
import { graphql } from '@stump/graphql'
import { handleApiError } from '@stump/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { SteppedFormContext } from '@/components/steppedForm'
import SteppedFormSceneHeader from '@/components/steppedForm/SteppedFormSceneHeader'
import paths from '@/paths'

import { intoAPI, SmartListFormSchema } from '../../components/smartList/createOrUpdate/schema'
import CreateSmartListForm from './CreateSmartListForm'

const mutation = graphql(`
	mutation CreateSmartListScene($input: SaveSmartListInput!) {
		createSmartList(input: $input) {
			id
			name
		}
	}
`)

export default function CreateSmartListScene() {
	const client = useQueryClient()
	const { sdk } = useSDK()
	const navigate = useNavigate()

	const {
		mutate: mutate,
		isPending: isCreating,
		error: error,
	} = useGraphQLMutation(mutation, {
		onSuccess: (data) => {
			navigate(paths.smartList(data.createSmartList.id))
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartLists] })
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListNames] })
		},
	})
	const createError = useMemo(() => (error ? handleApiError(error) : undefined), [error])

	const [formStep, setFormStep] = useState(1)

	/**
	 * A function which will handle the submission of the form, creating a new library
	 * provided the form values. Note the transformation of certain values.
	 */
	const handleSubmit = useCallback(
		(values: SmartListFormSchema) => {
			const payload = intoAPI(values)
			mutate({ input: payload })
		},
		[mutate],
	)

	return (
		<div className="relative flex flex-1 flex-col">
			<SteppedFormContext.Provider
				value={{
					currentStep: formStep,
					localeBase: 'createSmartListScene',
					setStep: setFormStep,
					stepsBeforeReview: 3,
				}}
			>
				<SteppedFormSceneHeader />

				<SceneContainer>
					<div className="flex flex-col gap-12">
						{createError && <Alert variant="destructive">{createError}</Alert>}

						<Suspense>
							<CreateSmartListForm onSubmit={handleSubmit} isLoading={isCreating} />
						</Suspense>
					</div>
				</SceneContainer>
			</SteppedFormContext.Provider>
		</div>
	)
}
