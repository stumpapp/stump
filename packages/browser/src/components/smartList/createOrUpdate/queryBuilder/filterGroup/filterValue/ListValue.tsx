import { ComboBox } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { SmartListFormSchema } from '@/components/smartList/createOrUpdate'

import { useFilterGroupContext } from '../context'

type Props = {
	idx: number
}

export default function ListValue({ idx }: Props) {
	const { t } = useLocaleContext()
	const { groupIdx } = useFilterGroupContext()

	const form = useFormContext<SmartListFormSchema>()
	const values = useMemo(
		() =>
			(form.watch(`filters.groups.${groupIdx}.filters.${idx}.value`) || []) as (string | number)[],
		[form, groupIdx, idx],
	)

	const addValue = useCallback(
		(value: string | number) => {
			if (Array.isArray(values) && !values.includes(value)) {
				// @ts-expect-error: fix this irritating type error re: string | number array
				form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, [...values, value])
			}
		},
		[form, groupIdx, idx, values],
	)

	const handleChange = useCallback(
		(values?: string[]) => {
			if (!values) {
				form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
			} else {
				form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, values)
			}
		},
		[form, groupIdx, idx],
	)

	// FIXME: Casting to string will obviously break number lists
	return (
		<ComboBox
			options={values.map((value) => ({ label: String(value), value: String(value) }))}
			value={values.map(String)}
			placeholder={t(getKey('placeholder'))}
			filterEmptyMessage={t(getKey('emptyState'))}
			onChange={handleChange}
			onAddOption={({ value }) => addValue(value)}
			isMultiSelect
			filterable
		/>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters.listValue'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
