import { zodResolver } from '@hookform/resolvers/zod'
import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Form } from '@stump/components'
import { graphql } from '@stump/graphql'
import { ClipboardCheck, Filter, Info } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { SteppedForm, type SteppedFormStep } from '@/components/steppedForm'
import { useTranslate } from '@/hooks/useTranslate'

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
	const { t } = useTranslate()
	const { sdk } = useSDK()

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

	const steps = useMemo<SteppedFormStep[]>(
		() => [
			{
				key: 'basics',
				icon: Info,
				fields: ['name', 'description', 'visibility'],
				render: () => (
					<>
						<BasicDetails />
						<AccessSettings isCreating />
					</>
				),
			},
			{
				key: 'filters',
				icon: Filter,
				fields: ['filters.groups', 'filters.joiner'],
				render: () => <SmartListQueryBuilder />,
			},
			{
				key: 'review',
				icon: ClipboardCheck,
				isReview: true,
				render: () => <SmartListReview />,
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
		<Form form={form} onSubmit={onSubmit} id="createSmartListForm" onKeyDown={handleKeyDown}>
			<SteppedForm
				localeBase="createSmartListScene"
				steps={steps}
				submitLabel={t('createSmartListScene.form.buttons.confirm')}
				isSubmitting={isLoading}
			/>
		</Form>
	)
}
