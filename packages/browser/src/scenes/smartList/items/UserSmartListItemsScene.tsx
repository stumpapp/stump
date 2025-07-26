import { cn } from '@stump/components'
import { Media, SmartListGroupedItem } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { SceneContainer } from '@/components/container'

import { useSmartListContext } from '../context'
import { useSmartListItems } from '../graphql'
import { GroupedSmartListItemList } from './list'
import { GroupedSmartListItemTable, SmartListBookTable } from './table'

// FIXME: performance of these tables is ass, it really just needs virtualization
export default function UserSmartListItemsScene() {
	const { t } = useLocaleContext()
	const {
		list: { id },
		layout,
	} = useSmartListContext()

	const { items, isLoading } = useSmartListItems({ id })

	if (isLoading || !items) {
		return null
	}

	const shouldThrow = !items
	if (shouldThrow) {
		// TODO: redirect for these?
		throw new Error(t('userSmartListScene.itemsScene.smartListNotFound'))
	}

	const renderContent = () => {
		const isGrouped = 'items' in items
		if (isGrouped) {
			return layout === 'table' ? (
				<GroupedSmartListItemTable items={items.items as SmartListGroupedItem[]} />
			) : (
				<GroupedSmartListItemList items={items.items as SmartListGroupedItem[]} />
			)
		}

		return layout === 'table' ? (
			<SmartListBookTable books={items.books as Media[]} />
		) : (
			<pre className="text-xs text-foreground-subtle">{JSON.stringify({ items }, null, 2)}</pre>
		)
	}

	return (
		<SceneContainer className={cn({ 'p-0 py-4': layout === 'table' })}>
			{renderContent()}
		</SceneContainer>
	)
}
