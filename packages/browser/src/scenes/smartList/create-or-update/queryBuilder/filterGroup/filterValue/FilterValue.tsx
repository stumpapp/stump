import { cn, Input } from '@stump/components'
import React, { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { match } from 'ts-pattern'

import {
	isListOperator,
	isNumberField,
	isNumberOperator,
	SmartListFormSchema,
} from '../../../form/schema'
import ListValue from './ListValue'
import RangeValue, { RangeFilterDef } from './RangeValue'

type Props = {
	groupIdx: number
	idx: number
}

type FieldDef = SmartListFormSchema['filters']['groups'][number]['filters'][number]

export default function FilterValue({ groupIdx, idx }: Props) {
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

	const isNumber = isNumberField(fieldDef.field)

	return (
		<Input
			type={isNumber ? 'number' : 'text'}
			placeholder="Value"
			className={cn({ 'md:w-52': isNumber })}
		/>
	)
}
