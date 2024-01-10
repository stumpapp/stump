import {
	Accordion,
	Button,
	Card,
	Heading,
	IconButton,
	Label,
	NativeSelect,
	Text,
	ToolTip,
} from '@stump/components'
import { MinusCircle } from 'lucide-react'
import React, { useMemo } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { defaultMediaFilter, Schema, toAPIFilters } from './schema'

type SubSchema = Pick<Schema, 'filters'>

export default function FilterConfiguration() {
	const form = useFormContext<SubSchema>()
	const { append, remove } = useFieldArray<SubSchema>({
		name: 'filters.groups',
	})

	const [groups, joiner] = form.watch(['filters.groups', 'filters.joiner'])

	const apiFilters = useMemo(
		() =>
			toAPIFilters({
				groups: groups ?? [],
				joiner,
			}),
		[groups, joiner],
	)
	const formattedFilters = useMemo(() => JSON.stringify(apiFilters, null, 2), [apiFilters])

	const handleAddGroup = () => append({ filters: [], joiner: 'and' })
	const handleRemoveGroup = (index: number) => remove(index)

	return (
		<div className="flex flex-col gap-y-6">
			<div>
				<Heading size="md">Configuration</Heading>
				<Text variant="muted" size="sm">
					Change the filters, sorting, and other settings for this smart list
				</Text>
			</div>

			<Accordion type="single" collapsible>
				<Accordion.Item value="raw_filters" className="border-none">
					<Accordion.Trigger noUnderline asLabel>
						<div className="flex flex-col items-start gap-y-1">
							<span>Raw filters</span>
							<Text variant="muted" size="sm">
								A JSON representation of the filters
							</Text>
						</div>
					</Accordion.Trigger>
					<Accordion.Content className="rounded-sm bg-background-200 p-4">
						<pre className="text-xs text-contrast-200">{formattedFilters}</pre>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion>

			<div className="flex max-w-sm flex-col gap-y-1.5">
				<Label>Top-level join method</Label>
				<NativeSelect
					options={[
						{ label: 'All', value: 'AND' },
						{ label: 'Any', value: 'OR' },
					]}
					{...form.register('filters.joiner')}
				/>
				<Text variant="muted" size="sm">
					{joiner === 'AND'
						? 'All filter groups must be true for a book to be matched'
						: 'Any filter group must be true for a book to be matched'}
				</Text>
			</div>

			<div>
				<Label>Groups</Label>
				<div className="mt-4 flex flex-col gap-y-6">
					{groups.map((_, index) => (
						<FilterGroup
							key={index}
							index={index}
							onRemove={groups.length > 1 ? () => handleRemoveGroup(index) : undefined}
						/>
					))}

					<div>
						<Button variant="ghost" onClick={handleAddGroup}>
							Add group
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

type FilterGroupProps = {
	index: number
	onRemove?: () => void
}
function FilterGroup({ index, onRemove }: FilterGroupProps) {
	const form = useFormContext<SubSchema>()

	const { filters, joiner } = form.watch(`filters.groups.${index}`)

	const { append } = useFieldArray<SubSchema>({
		name: `filters.groups.${index}.filters` as const,
	})

	return (
		<Card key={index} className="relative flex flex-col gap-y-4 p-4">
			<div className="flex flex-col gap-y-1.5">
				<Label>Join method</Label>
				<NativeSelect
					options={[
						{ label: 'All', value: 'and' },
						{ label: 'Any', value: 'or' },
						{ label: 'None', value: 'not' },
					]}
					{...form.register(`filters.groups.${index}.joiner`)}
				/>
				<Text variant="muted" size="xs">
					{joiner === 'and'
						? 'All filters in this group must be true'
						: joiner === 'or'
						? 'Any one filter in this group can be true'
						: 'None of the filters in this group can be true'}
				</Text>
			</div>

			<div className="flex flex-col gap-y-4">
				{filters.map((filter, index) => (
					// <Filter
					// 	key={index}
					// 	index={index}
					// 	onRemove={filters.length > 1 ? () => remove(index) : undefined}
					// />

					<div key={index}>{JSON.stringify(filter)}</div>
				))}
			</div>

			<div>
				<Button variant="ghost" onClick={() => append(defaultMediaFilter)}>
					Add filter
				</Button>
			</div>

			{onRemove && (
				<div className="absolute right-0 top-0">
					<ToolTip content="Remove group">
						<IconButton
							variant="ghost"
							className="group hover:bg-background"
							onClick={() => onRemove()}
						>
							<MinusCircle className="h-4 w-4 text-muted text-opacity-80 transition-opacity duration-150 group-hover:text-opacity-100" />
						</IconButton>
					</ToolTip>
				</div>
			)}
		</Card>
	)
}
