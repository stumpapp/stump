import { FlatGrid, FlatGridProps } from 'react-native-super-grid'

import type { Any } from '~/lib/utils'

import RefreshControl from '../RefreshControl'
import { Heading } from '../ui'
import { useGridItemSize } from './useGridItemSize'

type Props<ItemType = Any> = {
	header?: string
	onRefresh?: () => void
	isRefetching?: boolean
} & Omit<FlatGridProps<ItemType>, 'refreshControl'>

export default function ImageGrid<ItemType = Any>({
	header,
	onRefresh,
	isRefetching,
	...props
}: Props<ItemType>) {
	const { spacing } = useGridItemSize()
	return (
		<FlatGrid
			horizontal={false}
			ListHeaderComponent={
				header
					? () => (
							<Heading size="xl" className="px-4 pb-4 font-semibold">
								{header}
							</Heading>
						)
					: undefined
			}
			refreshControl={
				onRefresh ? (
					<RefreshControl refreshing={isRefetching || false} onRefresh={onRefresh} />
				) : undefined
			}
			onEndReachedThreshold={props.onEndReached ? 0.75 : undefined}
			spacing={spacing}
			{...props}
		/>
	)
}
