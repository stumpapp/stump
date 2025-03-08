import { FlashList, FlashListProps } from '@shopify/flash-list'

import type { Any } from '~/lib/utils'

import RefreshControl from '../RefreshControl'
import { Heading } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props<ItemType = Any> = {
	header?: string
	onRefresh?: () => void
	isRefetching?: boolean
} & Omit<FlashListProps<ItemType>, 'refreshControl'>

export default function ImageGrid<ItemType = Any>({
	header,
	onRefresh,
	isRefetching,
	...props
}: Props<ItemType>) {
	const { numColumns, sizeEstimate } = useGridItemSize()

	return (
		<FlashList
			numColumns={numColumns}
			ListHeaderComponent={
				<Heading size="xl" className="mb-4">
					{header}
				</Heading>
			}
			contentContainerStyle={{ padding: 16 }}
			estimatedItemSize={sizeEstimate}
			refreshControl={
				onRefresh ? (
					<RefreshControl refreshing={isRefetching || false} onRefresh={onRefresh} />
				) : undefined
			}
			onRefresh={onRefresh}
			refreshing={isRefetching}
			onEndReachedThreshold={props.onEndReached ? 0.65 : undefined}
			{...props}
		/>
	)
}
