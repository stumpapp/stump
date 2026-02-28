import { ComboBox, NativeSelect } from '@stump/components'
import { ReadingStatus } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { isConceptualOperator, SmartListFormSchema } from '@/components/smartList/createOrUpdate'

import { useFilterGroupContext } from '../context'
import { FieldDef } from './FilterValue'

type Props = {
	idx: number
}

type EnumOption = {
	value: string
	label: string
	devOnly?: boolean
}

const CONCEPTUAL_FIELD_OPTIONS: Record<string, EnumOption[]> = {
	readingStatus: [
		{ value: ReadingStatus.Reading, label: 'Reading' },
		{ value: ReadingStatus.Finished, label: 'Finished' },
		{ value: ReadingStatus.NotStarted, label: 'Not Started' },
		{ value: ReadingStatus.Abandoned, label: 'Abandoned', devOnly: true },
	],
}

const isDev = import.meta.env.DEV

export default function EnumValue({ idx }: Props) {
	const { t } = useLocaleContext()
	const { groupIdx } = useFilterGroupContext()

	const form = useFormContext<SmartListFormSchema>()
	const fieldDef = useWatch({
		control: form.control,
		name: `filters.groups.${groupIdx}.filters.${idx}`,
		defaultValue: {} as FieldDef,
	})

	const value = useWatch({
		control: form.control,
		name: `filters.groups.${groupIdx}.filters.${idx}.value`,
		defaultValue: undefined,
	})

	const options = useMemo(() => {
		const fieldOptions = CONCEPTUAL_FIELD_OPTIONS[fieldDef.field] || []
		return fieldOptions.filter((opt) => !opt.devOnly || isDev)
	}, [fieldDef.field])

	const isMultiSelect = useMemo(() => {
		const op = fieldDef.operation
		return isConceptualOperator(op) && (op === 'isAnyOf' || op === 'isNoneOf')
	}, [fieldDef.operation])

	const handleSingleChange = useCallback(
		(newValue?: string) => {
			if (newValue) {
				form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, newValue)
			} else {
				form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
			}
		},
		[form, groupIdx, idx],
	)

	const handleMultiChange = useCallback(
		(values?: string[]) => {
			if (!values || values.length === 0) {
				form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
				return
			}
			form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, values)
		},
		[form, groupIdx, idx],
	)

	if (isMultiSelect) {
		const arrayValue = Array.isArray(value) ? value : value ? [value] : []
		return (
			<ComboBox
				options={options.map((opt) => ({ label: opt.label, value: opt.value }))}
				value={arrayValue.map(String)}
				placeholder={t(getKey('placeholder'))}
				filterEmptyMessage={t(getKey('emptyState'))}
				onChange={handleMultiChange}
				isMultiSelect
				filterable
			/>
		)
	}

	return (
		<NativeSelect
			options={[
				{ label: t(getKey('selectPlaceholder')), value: '', disabled: true },
				...options.map((opt) => ({ label: opt.label, value: opt.value })),
			]}
			value={(value as string) || ''}
			onChange={(e) => handleSingleChange(e.target.value || undefined)}
			className="md:w-52"
		/>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters.enumValue'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
