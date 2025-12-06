import { cn } from '@stump/components'
import { SmartListGroupedItem } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { SceneContainer } from '@/components/container'

import { useSmartListContext } from '../context'
import { useSmartListItems } from '../graphql'
import { GroupedSmartListItemList } from './list'
import VirtualSmartListTable from './table/VirtualSmartListTable'

// FIXME: performance of these tables is ass, it really just needs virtualization
export default function UserSmartListItemsScene() {
	const { t } = useLocaleContext()
	const {
		list: { id },
		layout,
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

		if (layout === 'table') {
			if (isGrouped) {
				return <VirtualSmartListTable items={items.items as SmartListGroupedItem[]} />
			} else {
				// TODO: Implement flat table support in VirtualSmartListTable
				return (
					<div className="p-4">
						Flat table view not yet supported. Please switch to a grouped view or list layout.
					</div>
				)
			}
		}

		if (isGrouped) {
			return <GroupedSmartListItemList items={items.items as SmartListGroupedItem[]} />
		}

		return (
			<pre className="text-xs text-foreground-subtle">{JSON.stringify({ items }, null, 2)}</pre>
		)
	}

	return (
		<SceneContainer className={cn({ 'p-0 py-4': layout === 'table' })}>
			{renderContent()}
		</SceneContainer>
	)
}
