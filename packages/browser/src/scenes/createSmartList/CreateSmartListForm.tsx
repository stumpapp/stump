import { zodResolver } from '@hookform/resolvers/zod'
import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Button, cn, Form } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'

import { ContentContainer } from '@/components/container'
import { useSteppedFormContext } from '@/components/steppedForm'

import { SmartListQueryBuilder } from '../../components/smartList/createOrUpdate/queryBuilder'
import { createSchema, SmartListFormSchema } from '../../components/smartList/createOrUpdate/schema'
import AccessSettings from '../../components/smartList/createOrUpdate/sections/AccessSettings'
import BasicDetails from '../../components/smartList/createOrUpdate/sections/BasicDetails'
import SmartListReview from '../../components/smartList/createOrUpdate/sections/SmartListReview'

type Props = {
	onSubmit: (values: SmartListFormSchema) => void
	isLoading?: boolean
}

const query = graphql(`
	query CreateSmartListForm {
		smartLists(input: { mine: true }) {
			name
		}
	}
`)

export default function CreateSmartListForm({ onSubmit, isLoading }: Props) {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { currentStep, setStep } = useSteppedFormContext()

	const {
		data: { smartLists: lists },
	} = useSuspenseGraphQL(query, [sdk.cacheKeys.smartListNames])

	const form = useForm<SmartListFormSchema>({
		defaultValues: {
			filters: {
				groups: [],
				joiner: 'and',
			},
			visibility: 'PRIVATE',
		},
		resolver: zodResolver(createSchema(lists?.map(({ name }) => name) ?? [], t)),
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
			} else {
				console.warn('Form validation failed, not changing step')
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
