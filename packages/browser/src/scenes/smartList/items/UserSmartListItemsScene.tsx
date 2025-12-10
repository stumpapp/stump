import { cn } from '@stump/components'
import { Media, SmartListGroupedItem } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { SceneContainer } from '@/components/container'

import { useSmartListContext } from '../context'
import { useSmartListItems } from '../graphql'
import GroupedVirtualSmartListTable from './table/GroupedVirtualSmartListTable'
import VirtualSmartListTable from './table/VirtualSmartListTable'

export default function UserSmartListItemsScene() {
	const { t } = useLocaleContext()
	const {
		list: { id },
	} = useSmartListContext()

	const { items, isLoading } = useSmartListItems({ id })

	if (isLoading) {
		return null
	}

	if (!items) {
		throw new Error(t('userSmartListScene.itemsScene.smartListNotFound'))
	}

	const renderContent = () => {
		const isGrouped = 'items' in items

		if (isGrouped) {
			return <GroupedVirtualSmartListTable items={items.items as SmartListGroupedItem[]} />
		} else {
			return <VirtualSmartListTable books={items.books as Media[]} />
		}
	}

	return <SceneContainer className={cn('p-0 py-4')}>{renderContent()}</SceneContainer>
}
