import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseGraphQL } from '@stump/client'
import { Button, Form } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
	BasicDetails,
	createSchema,
	intoForm,
	SmartListFormSchema,
} from '@/components/smartList/createOrUpdate'
import { compareByKeys } from '@/utils/compare'

import { useSmartListSettings } from '../context'

type SubSchema = Pick<SmartListFormSchema, 'name' | 'description'>

const query = graphql(`
	query SmartListBasicSettingsScene {
		smartLists(input: { mine: true }) {
			name
		}
	}
`)
export default function BasicSettingsScene() {
	const { t } = useLocaleContext()
	const { list, patch } = useSmartListSettings()
	const {
		data: { smartLists: lists },
	} = useSuspenseGraphQL(query, ['smartListBasicSettingsScene'])
	const listNames = (lists || []).map(({ name }) => name)

	const form = useForm<SubSchema>({
		defaultValues: intoForm(list),
		reValidateMode: 'onChange',
		resolver: zodResolver(createSchema(listNames, t, list)),
	})
	const [name, description] = useWatch({
		control: form.control,
		name: ['name', 'description'],
	})

	const hasChanges = useMemo(
		() => !compareByKeys(list as SubSchema, { description, name }, ['name', 'description']),
		[list, name, description],
	)

	const handleSubmit = useCallback(
		({ name, description }: SubSchema) =>
			patch({
				description,
				name,
			}),
		[patch],
	)

	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="flex flex-col gap-12">
			<BasicDetails />

			<div>
				<Button type="submit" disabled={!hasChanges} variant="primary">
					Update list
				</Button>
			</div>
		</Form>
	)
}
