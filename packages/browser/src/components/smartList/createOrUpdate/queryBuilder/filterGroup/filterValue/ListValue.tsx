import { ComboBox } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { isNumberField, SmartListFormSchema } from '@/components/smartList/createOrUpdate'

import { useFilterGroupContext } from '../context'
import { FieldDef } from './FilterValue'

type Props = {
	idx: number
}

export default function ListValue({ idx }: Props) {
	const { t } = useLocaleContext()
	const { groupIdx, isLocked } = useFilterGroupContext()

	const form = useFormContext<SmartListFormSchema>()
	const fieldDef = useMemo(
		() => form.watch(`filters.groups.${groupIdx}.filters.${idx}`) || ({} as FieldDef),
		[form, groupIdx, idx],
	)
	const values = useMemo(
		() =>
			(form.watch(`filters.groups.${groupIdx}.filters.${idx}.value`) || []) as (string | number)[],
		[form, groupIdx, idx],
	)

	const isNumber = isNumberField(fieldDef.field)

	const parseValue = useCallback(
		(value: string | number) => {
			if (isNumber) {
				return (value as number) * 1
			}
			return value
		},
		[isNumber],
	)

	const addValue = useCallback(
		(value: string | number) => {
			const parsedValue = parseValue(value)
			if (typeof parsedValue === 'number' && isNaN(parsedValue)) {
				form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
				return
			}

			if (Array.isArray(values) && !values.includes(parsedValue)) {
				// @ts-expect-error: fix this irritating type error re: string | number array
				form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, [...values, parsedValue])
			}
		},
		[form, groupIdx, idx, values, parseValue],
	)

	const handleChange = useCallback(
		(values?: string[]) => {
			if (!values) {
				form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
				return
			}

			const parsedValues = values.map(parseValue) as string[] | number[]
			if (isNumber && parsedValues.some((value) => isNaN(value as number))) {
				form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
				return
			}

			form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, parsedValues)
		},
		[form, groupIdx, idx, isNumber, parseValue],
	)

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
			disabled={isLocked}
		/>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters.listValue'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
