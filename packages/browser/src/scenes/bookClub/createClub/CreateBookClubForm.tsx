import { zodResolver } from '@hookform/resolvers/zod'
import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Form } from '@stump/components'
import { graphql } from '@stump/graphql'
import { ClipboardCheck, Info, Shield, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	BasicBookClubInformation,
	BookClubMembershipOptions,
	BookClubRoleMappingForm,
	buildSchema,
	CreateOrUpdateBookClubSchema,
} from '@/components/bookClub/createOrUpdateForm'
import { SteppedForm, type SteppedFormStep } from '@/components/steppedForm'
import { useTranslate } from '@/hooks/useTranslate'

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
	const { t } = useTranslate()

	const {
		data: { bookClubs },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookClubs', ['names']))
	const existingNames = useMemo(() => bookClubs.map(({ name }) => name), [bookClubs])

	const schema = useMemo(() => buildSchema(t, existingNames, true), [t, existingNames])
	const form = useForm<CreateOrUpdateBookClubSchema>({
		resolver: zodResolver(schema),
	})

	const steps = useMemo<SteppedFormStep[]>(
		() => [
			{
				key: 'basics',
				icon: Info,
				fields: ['name', 'description', 'isPrivate'],
				render: () => <BasicBookClubInformation />,
			},
			{
				key: 'roles',
				icon: Shield,
				render: () => <BookClubRoleMappingForm />,
			},
			{
				key: 'membership',
				icon: Users,
				render: () => <BookClubMembershipOptions />,
			},
			{
				key: 'review',
				icon: ClipboardCheck,
				isReview: true,
				render: () => <CreateClubReview />,
			},
		],
		[],
	)

	/**
	 * Prevent a submit event triggering when the enter key is pressed on an input
	 */
	const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
			e.preventDefault()
		}
	}

	return (
		<Form
			id="create-club-form"
			className="flex flex-1 flex-col"
			fieldsetClassName="flex-1"
			form={form}
			onSubmit={onSubmit}
			onKeyDown={handleKeyDown}
		>
			<SteppedForm
				localeBase="createBookClubScene"
				steps={steps}
				submitLabel={t('createBookClubScene.form.submit')}
			/>
		</Form>
	)
}
