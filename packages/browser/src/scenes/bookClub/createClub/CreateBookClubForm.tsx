import { zodResolver } from '@hookform/resolvers/zod'
import { useSDK, useSuspenseGraphQL } from '@stump/client'
// import { useBookClubsQuery } from '@stump/client'
import { Button, cn, Form } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	BasicBookClubInformation,
	BookClubMembershipOptions,
	BookClubRoleMappingForm,
	buildSchema,
	CreateOrUpdateBookClubSchema,
} from '@/components/bookClub/createOrUpdateForm'
import { ContentContainer } from '@/components/container'
import { useSteppedFormContext } from '@/components/steppedForm'

import CreateClubReview from './CreateClubReview'

const query = graphql(`
	query CreateBookClubForm {
		bookClubs {
			name
			slug
		}
	}
`)

type Props = {
	onSubmit: (values: CreateOrUpdateBookClubSchema) => void
}

export default function CreateBookClubForm({ onSubmit }: Props) {
	const { sdk } = useSDK()
	const { t } = useLocaleContext()
	const { currentStep, setStep } = useSteppedFormContext()

	const {
		data: { bookClubs },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookClubs', ['names']))
	const existingNames = useMemo(() => bookClubs.map(({ name }) => name), [bookClubs])

	const schema = useMemo(() => buildSchema(t, existingNames, true), [t, existingNames])
	const form = useForm<CreateOrUpdateBookClubSchema>({
		resolver: zodResolver(schema),
	})

	/**
	 * A callback to handle changing the form step. This will validate the current step
	 * before moving to the next step.
	 */
	const handleChangeStep = useCallback(
		async (nextStep: number) => {
			let isValid = true

			switch (currentStep) {
				case 1:
					isValid = await form.trigger(['name', 'description', 'isPrivate'])
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
						<BasicBookClubInformation />
						{renderNextButton(2)}
					</>
				)
			case 2:
				return (
					<>
						<BookClubRoleMappingForm />
						{renderNextButton(3)}
					</>
				)
			case 3:
				return (
					<>
						<BookClubMembershipOptions />
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

const LOCAL_BASE = 'createBookClubScene.form'
export const getLocaleKey = (key: string) => `${LOCAL_BASE}.${key}`
