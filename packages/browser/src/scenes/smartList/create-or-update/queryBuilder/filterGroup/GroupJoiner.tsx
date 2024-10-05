import { cn, Tabs, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'
import { useFormContext } from 'react-hook-form'

import { FilterGroupJoiner, SmartListFormSchema } from '../../form/schema'
import { useFilterGroupContext } from './context'

export default function GroupJoiner() {
	const form = useFormContext<SmartListFormSchema>()

	const { t } = useLocaleContext()
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
						<Text className="cursor-pointer truncate">{t(getJoinerKey('and', 'label'))}</Text>
					</Tabs.Trigger>

					<Tabs.Trigger
						value="or"
						asChild
						className="w-8 min-w-[unset] rounded-lg px-1 text-xs"
						onClick={() => form.setValue(`filters.groups.${groupIdx}.joiner`, 'or')}
					>
						<Text className={cn('truncate', { 'cursor-pointer': true })}>
							{t(getJoinerKey('or', 'label'))}
						</Text>
					</Tabs.Trigger>

					<Tabs.Trigger
						value="not"
						asChild
						className="w-8 min-w-[unset] rounded-lg px-1 text-xs"
						onClick={() => form.setValue(`filters.groups.${groupIdx}.joiner`, 'not')}
					>
						<Text className={cn('truncate', { 'cursor-pointer': true })}>
							{t(getJoinerKey('not', 'label'))}
						</Text>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs>
			<Text className="hidden text-sm lg:inline-flex" variant="muted">
				{t(getJoinerKey(joiner, 'description'))}
			</Text>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields.queryBuilder.groupJoiner'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getJoinerKey = (joiner: FilterGroupJoiner, key: string) =>
	getKey(`${joiner?.toLowerCase()}.${key}`)
