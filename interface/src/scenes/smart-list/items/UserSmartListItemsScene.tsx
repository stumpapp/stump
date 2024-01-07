import { useSmartListItemsQuery } from '@stump/client'
import { cn } from '@stump/components'
import React from 'react'

import { SceneContainer } from '@/components/container'

import { useSmartListContext } from '../context'
import { GroupedSmartListItemList } from './list'
import { GroupedSmartListItemTable, SmartListBookTable } from './table'

export default function UserSmartListItemsScene() {
	const {
		list: { id },
		layout,
	} = useSmartListContext()

	const { items, isLoading } = useSmartListItemsQuery({ id })

	if (isLoading) {
		return null
	}

	const shouldThrow = !items
	if (shouldThrow) {
		// TODO: redirect for these?
		throw new Error('The requested smart list does not exist!')
	}

	const renderContent = () => {
		const isGrouped = items.type !== 'Books'

		if (isGrouped) {
			return layout === 'table' ? (
				<GroupedSmartListItemTable items={items.items} />
			) : (
				<GroupedSmartListItemList items={items.items} />
			)
		}

		return layout === 'table' ? (
			<SmartListBookTable books={items.items} />
		) : (
			<pre className="text-xs text-contrast-200">{JSON.stringify({ items }, null, 2)}</pre>
		)
	}

	return (
		<SceneContainer className={cn({ 'p-0 py-4': layout === 'table' })}>
			{renderContent()}
		</SceneContainer>
	)
}
