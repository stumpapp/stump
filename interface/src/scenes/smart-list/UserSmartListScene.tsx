import { useSmartListItemsQuery } from '@stump/client'
import React from 'react'

import { SceneContainer } from '@/components/container'

import { useSmartListContext } from './context'
import GroupedSmartListItemList from './GroupedSmartListItemList'

export default function UserSmartListScene() {
	const {
		list: { id },
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
			return <GroupedSmartListItemList items={items.items} />
		}

		return <pre className="text-xs text-contrast-200">{JSON.stringify({ items }, null, 2)}</pre>
	}

	return <SceneContainer>{renderContent()}</SceneContainer>
}
