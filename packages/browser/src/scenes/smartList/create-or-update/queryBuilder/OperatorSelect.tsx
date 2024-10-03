import { Button, cn, Command, Popover } from '@stump/components'
import { ChevronsUpDown } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { match } from 'ts-pattern'

import {
	isNumberField,
	isStringField,
	ListOperation,
	NumberOperation,
	Operation,
	SmartListFormSchema,
	StringOperation,
} from '../form/newSchema'

type Props = {
	groupIdx: number
	idx: number
}

type FieldDef = SmartListFormSchema['filters']['groups'][number]['filters'][number]

export default function OperatorSelect({ groupIdx, idx }: Props) {
	const form = useFormContext<SmartListFormSchema>()

	const [isOpen, setIsOpen] = useState(false)

	const { update } = useFieldArray({
		control: form.control,
		name: `filters.groups.${groupIdx}.filters`,
	})

	const fieldDef = useMemo(
		() => form.watch(`filters.groups.${groupIdx}.filters.${idx}`) || ({} as FieldDef),
		[form, groupIdx, idx],
	)

	const updateField = useCallback(
		(params: Partial<FieldDef>, close = true) => {
			const newField = { ...fieldDef, ...params }
			update(idx, newField)
			setIsOpen(!close)
		},
		[update, fieldDef, idx],
	)

	const operators = useMemo(
		() =>
			match(fieldDef.field)
				.when(
					(field) => isStringField(field),
					() => ['contains', 'excludes', 'not'] as StringOperation[],
				)
				.when(
					(field) => isNumberField(field),
					() => ['gt', 'gte', 'lt', 'lte', 'not', 'range'] as NumberOperation[],
				)
				.otherwise(() => [] as Operation[]),
		[fieldDef],
	)

	const selectGroups = useMemo(() => {
		const arrayGroup = operatorGroups.list

		return [
			{
				label: 'Equality',
				operators: operators,
			},
			{
				label: 'List',
				operators: arrayGroup,
			},
		]
	}, [operators])

	useEffect(() => {
		const allOperators = [...operators, ...operatorGroups.list]
		const shouldReset = !allOperators.includes(fieldDef.operation)
		if (shouldReset && fieldDef.operation) {
			updateField({ operation: undefined }, false)
		}
	}, [fieldDef, operators, updateField])

	if (!fieldDef) return null

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<Popover.Trigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={isOpen}
					className={cn(
						'h-[unset] justify-between truncate border-edge-subtle text-foreground-subtle outline-none hover:bg-background-surface data-[state=open]:bg-transparent data-[state=open]:ring-2 data-[state=open]:ring-edge-brand data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-background',
						{ 'text-foreground-muted': !fieldDef.operation },
					)}
				>
					{operatorMap[fieldDef.operation] || 'Operator'}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</Popover.Trigger>

			<Popover.Content className="mt-1 max-h-96 w-52 overflow-y-auto p-0" align="start">
				<Command>
					{selectGroups.map(({ label, operators }) => (
						<Command.Group key={label} heading={label}>
							{operators.map((operator) => (
								<Command.Item
									key={operator}
									onSelect={() => updateField({ operation: operator })}
									className={cn('transition-all duration-75', {
										'text-brand': operator === fieldDef.operation,
									})}
									value={operator}
								>
									{operatorMap[operator]}
								</Command.Item>
							))}
						</Command.Group>
					))}
				</Command>
			</Popover.Content>
		</Popover>
	)
}

const operatorGroups = {
	list: ['any', 'none'] satisfies ListOperation[],
	number: ['gt', 'gte', 'lt', 'lte', 'not', 'range'] satisfies NumberOperation[],
	string: ['contains', 'excludes', 'not'] satisfies StringOperation[],
}

const operatorMap: Record<Operation, string> = {
	any: 'any in list',
	contains: 'contains string',
	excludes: 'excludes string',
	gt: 'greater than',
	gte: 'greater than or equal to',
	lt: 'less than',
	lte: 'less than or equal to',
	none: 'none in list',
	not: 'not equal to',
	range: 'in range',
}
