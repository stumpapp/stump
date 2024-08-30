import { zodResolver } from '@hookform/resolvers/zod'
import { useBookClubsQuery } from '@stump/client'
import { Button, cn, Form } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	BasicInformation,
	buildSchema,
	CreateOrUpdateBookClubSchema,
	MembershipOptions,
	RoleMappingForm,
} from '@/components/bookClub/createOrUpdateForm'
import { ContentContainer } from '@/components/container'
import { useSteppedFormContext } from '@/components/steppedForm'

import CreateClubReview from './CreateClubReview'

const LOCAL_BASE = 'createBookClubScene.form'
export const getLocaleKey = (key: string) => `${LOCAL_BASE}.${key}`

type Props = {
	onSubmit: (values: CreateOrUpdateBookClubSchema) => void
}
export default function CreateBookClubForm({ onSubmit }: Props) {
	const { t } = useLocaleContext()
	const { currentStep, setStep } = useSteppedFormContext()

	const { bookClubs } = useBookClubsQuery({ params: { all: true }, suspense: true })

	const schema = useMemo(() => buildSchema(t, bookClubs ?? []), [t, bookClubs])
	const form = useForm<CreateOrUpdateBookClubSchema>({
		resolver: zodResolver(schema),
	})

	/**
	 * A callback to handle changing the form step. This will validate the current step
	 * before moving to the next step.
	 */
	const handleChangeStep = useCallback(
		async (nextStep: number) => {
			const isValid = true

			switch (currentStep) {
				case 1:
					// isValid = await form.trigger(['name', 'description', 'is_private'])
					break
				case 2:
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

	const renderNextButton = (nextStep: number) => (
		<div className="mt-6 flex w-full md:max-w-sm">
			<Button
				className="w-full md:w-auto"
				variant="primary"
				onClick={() => handleChangeStep(nextStep)}
			>
				Next step
			</Button>
		</div>
	)

	/**
	 * Render the current step of the form
	 */
	const renderStep = () => {
		switch (currentStep) {
			case 1:
				return (
					<>
						<BasicInformation />
						{renderNextButton(2)}
					</>
				)
			case 2:
				return (
					<>
						<RoleMappingForm />
						{renderNextButton(3)}
					</>
				)
			case 3:
				return (
					<>
						<MembershipOptions />
						{renderNextButton(4)}
					</>
				)
			default:
				return <CreateClubReview />
		}
	}

	return (
		<Form id="create-club-form" form={form} onSubmit={onSubmit}>
			<ContentContainer className="mt-0">
				{renderStep()}
				{/* <div className="flex flex-col gap-6 md:max-w-md">
					

				<CreatorPreferences />

				<div className="flex w-full md:max-w-sm">
					<Button type="submit" variant="primary" size="lg">
						{t(getLocaleKey('submit'))}
					</Button>
				</div> */}

				<div
					className={cn('mt-6 flex w-full md:max-w-sm', {
						'invisible hidden': currentStep < 4,
					})}
				>
					<Button type="submit" className="w-full md:w-auto" variant="primary">
						Create club
					</Button>
				</div>
			</ContentContainer>
		</Form>
	)
}
