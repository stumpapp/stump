import { useCreateSmartList } from '@stump/client'
import { Alert } from '@stump/components'
import { handleApiError } from '@stump/sdk'
import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { SteppedFormContext } from '@/components/steppedForm'
import SteppedFormSceneHeader from '@/components/steppedForm/SteppedFormSceneHeader'
import paths from '@/paths'

import { CreateSmartListForm } from './form'
import { intoAPI, SmartListFormSchema } from './form/schema'

export default function CreateSmartListScene() {
	const navigate = useNavigate()

	const { create, isCreating, error } = useCreateSmartList({
		onSuccess: ({ id }) => {
			navigate(paths.smartList(id))
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
			create(payload)
		},
		[create],
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
						{createError && <Alert level="error">{createError}</Alert>}

						<CreateSmartListForm onSubmit={handleSubmit} isLoading={isCreating} />
					</div>
				</SceneContainer>
			</SteppedFormContext.Provider>
		</div>
	)
}
