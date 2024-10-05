import { cn, Tabs, Text } from '@stump/components'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { SmartListFormSchema } from '../../form/schema'
import { useFilterGroupContext } from './context'

export default function GroupJoiner() {
	const form = useFormContext<SmartListFormSchema>()

	const { groupIdx } = useFilterGroupContext()

	const joiner = form.watch(`filters.groups.${groupIdx}.joiner`)

	return (
		<div className="flex items-center lg:space-x-4">
			<Tabs variant="primary" activeOnHover value={joiner}>
				<Tabs.List className="rounded-lg">
					<Tabs.Trigger
						value="and"
						asChild
						className="w-8 min-w-[unset] rounded-lg px-1 text-xs"
						onClick={() => form.setValue(`filters.groups.${groupIdx}.joiner`, 'and')}
					>
						<Text className="cursor-pointer truncate">AND</Text>
					</Tabs.Trigger>

					<Tabs.Trigger
						value="or"
						asChild
						className="w-8 min-w-[unset] rounded-lg px-1 text-xs"
						onClick={() => form.setValue(`filters.groups.${groupIdx}.joiner`, 'or')}
					>
						<Text className={cn('truncate', { 'cursor-pointer': true })}>OR</Text>
					</Tabs.Trigger>

					<Tabs.Trigger
						value="not"
						asChild
						className="w-8 min-w-[unset] rounded-lg px-1 text-xs"
						onClick={() => form.setValue(`filters.groups.${groupIdx}.joiner`, 'not')}
					>
						<Text className={cn('truncate', { 'cursor-pointer': true })}>NOT</Text>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs>
			<Text className="hidden text-sm lg:inline-flex" variant="muted">
				{JOINER_DESCRIPTION[joiner]}
			</Text>
		</div>
	)
}

const JOINER_DESCRIPTION: Record<string, string> = {
	and: 'All must be true',
	not: 'None can be true',
	or: 'At least one must be true',
}
