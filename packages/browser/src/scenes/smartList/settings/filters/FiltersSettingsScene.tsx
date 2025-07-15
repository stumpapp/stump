import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import pick from 'lodash/pick'
import { useCallback, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
	createSchema,
	intoForm,
	intoAPI,
	SmartListFormSchema,
} from '@/components/smartList/createOrUpdate'
import { SmartListQueryBuilder } from '@/components/smartList/createOrUpdate/queryBuilder'
import { compareByKeys } from '@/utils/compare'

import { useSmartListSettings } from '../context'

type SubSchema = Pick<SmartListFormSchema, 'filters' | 'grouping'>

export default function FiltersSettingsScene() {
	const { t } = useLocaleContext()
	const { list, patch } = useSmartListSettings()

	const listAsForm = useMemo(() => intoForm(list), [list])
	const form = useForm<SubSchema>({
		defaultValues: intoForm(list),
		reValidateMode: 'onChange',
		resolver: zodResolver(createSchema([], t, list)),
	})
	const formValues = useWatch({
		control: form.control,
	})

	const isChanged = useMemo(
		() => !compareByKeys(listAsForm as SubSchema, formValues, ['filters', 'grouping']),
		[listAsForm, formValues],
	)

	const handleSubmit = useCallback(
		({ filters, grouping }: SubSchema) => {
			patch(
				pick(
					intoAPI({
						...listAsForm,
						filters,
						grouping,
					}),
					['filters', 'grouping', 'joiner'],
				),
			)
		},
		[patch, listAsForm],
	)

	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="flex flex-col gap-12">
			<SmartListQueryBuilder />

			<div>
				<Button type="submit" disabled={!isChanged} variant="primary">
					Update filters
				</Button>
			</div>
		</Form>
	)
}
