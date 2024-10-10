import { cn, DatePicker, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import React, { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { match } from 'ts-pattern'

import {
	isDateField,
	isListOperator,
	isNumberField,
	isNumberOperator,
	SmartListFormSchema,
} from '@/components/smartList/createOrUpdate'

import { useFilterGroupContext } from '../context'
import ListValue from './ListValue'
import RangeValue, { RangeFilterDef } from './RangeValue'

type Props = {
	idx: number
}

export type FieldDef = SmartListFormSchema['filters']['groups'][number]['filters'][number]

export default function FilterValue({ idx }: Props) {
	const { t } = useLocaleContext()
	const { groupIdx } = useFilterGroupContext()

	const form = useFormContext<SmartListFormSchema>()

	const fieldDef = useMemo(
		() => form.watch(`filters.groups.${groupIdx}.filters.${idx}`) || ({} as FieldDef),
		[form, groupIdx, idx],
	)

	const variant = match(fieldDef.operation)
		.when(
			(value) => isListOperator(value),
			() => 'list',
		)
		.when(
			(value) => isNumberOperator(value),
			(value) => (value === 'range' ? 'range' : 'number'),
		)
		.otherwise(() => 'string')

	if (variant === 'list') {
		return <ListValue idx={idx} />
	} else if (variant === 'range') {
		return <RangeValue def={fieldDef as RangeFilterDef} idx={idx} />
	}

	if (isDateField(fieldDef.field)) {
		return (
			<DatePicker
				placeholder={t(getKey('date'))}
				selected={dayjs(fieldDef.value as string).toDate()}
				onChange={(value) => {
					if (value) {
						form.setValue(`filters.groups.${groupIdx}.filters.${idx}.value`, value)
					} else {
						form.resetField(`filters.groups.${groupIdx}.filters.${idx}.value`)
					}
				}}
				className="md:w-52"
			/>
		)
	}

	const isNumber = isNumberField(fieldDef.field)

	return (
		<Input
			type={isNumber ? 'number' : 'text'}
			placeholder={t(getKey('placeholder'))}
			className={cn({ 'md:w-52': isNumber })}
			{...form.register(`filters.groups.${groupIdx}.filters.${idx}.value`, {
				valueAsNumber: isNumber,
			})}
		/>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.filters.basicValue'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
