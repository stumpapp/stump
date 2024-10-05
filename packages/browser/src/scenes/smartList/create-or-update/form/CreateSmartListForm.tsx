import { zodResolver } from '@hookform/resolvers/zod'
import { Button, cn, Form } from '@stump/components'
import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'

import { ContentContainer } from '@/components/container'
import { useSteppedFormContext } from '@/components/steppedForm'

import { SmartListQueryBuilder } from '../queryBuilder'
import AccessSettings from './AccessSettings'
import BasicDetails from './BasicDetails'
import { schema, SmartListFormSchema } from './schema'
import SmartListReview from './SmartListReview'

type Props = {
	// existingNames: string[]
	onSubmit: (values: SmartListFormSchema) => void
	isLoading?: boolean
}

export default function CreateSmartListForm({ onSubmit, isLoading }: Props) {
	const { currentStep, setStep } = useSteppedFormContext()

	const form = useForm<SmartListFormSchema>({
		defaultValues: {
			filters: {
				groups: [],
				joiner: 'and',
			},
			visibility: 'PRIVATE',
		},
		resolver: zodResolver(schema),
	})

	/**
	 * A callback to handle changing the form step. This will validate the current step
	 * before moving to the next step.
	 */
	const handleChangeStep = useCallback(
		async (nextStep: number) => {
			let isValid = false

			switch (currentStep) {
				case 1:
					isValid = await form.trigger(['name', 'description', 'visibility'])
					break
				case 2:
					isValid = await form.trigger(['filters.groups', 'filters.joiner'])
					break
				default:
					break
			}

			if (isValid) {
				setStep(nextStep)
			}
		},
		[form, currentStep, setStep],
	)

	/**
	 * Render the current step of the form
	 */
	const renderStep = () => {
		switch (currentStep) {
			case 1:
				return (
					<>
						<BasicDetails />
						<AccessSettings isCreating />

						<div className="mt-6 flex w-full md:max-w-sm">
							<Button
								className="w-full md:w-auto"
								variant="primary"
								onClick={() => handleChangeStep(2)}
							>
								Next step
							</Button>
						</div>
					</>
				)
			case 2:
				return (
					<>
						<SmartListQueryBuilder />

						<div className="mt-6 flex w-full md:max-w-sm">
							<Button
								className="w-full md:w-auto"
								variant="primary"
								onClick={() => handleChangeStep(3)}
							>
								Next step
							</Button>
						</div>
					</>
				)
			default:
				return (
					<>
						<SmartListReview />
					</>
				)
		}
	}

	return (
		<Form form={form} onSubmit={onSubmit} id="createSmartListForm">
			<ContentContainer className="mt-0">
				{renderStep()}

				<div
					className={cn('mt-6 flex w-full md:max-w-sm', {
						'invisible hidden': currentStep < 3,
					})}
				>
					<Button
						type="submit"
						form="createSmartListForm"
						className="w-full md:w-auto"
						variant="primary"
						isLoading={isLoading}
					>
						Create list
					</Button>
				</div>
			</ContentContainer>
		</Form>
	)
}
