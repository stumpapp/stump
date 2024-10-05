import { ComboBox } from '@stump/components'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { SmartListFormSchema } from '../../../form/schema'
import { useFilterGroupContext } from '../context'

type Props = {
	idx: number
}

export default function ListValue({ idx }: Props) {
	const form = useFormContext<SmartListFormSchema>()

	const { groupIdx } = useFilterGroupContext()

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
			placeholder="Add values"
			filterEmptyMessage="No values"
			onChange={handleChange}
			onAddOption={({ value }) => addValue(value)}
			isMultiSelect
			filterable
		/>
	)
}
