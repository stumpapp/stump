import { FlashListProps } from '@shopify/flash-list'
import { InterfaceLayout } from '@stump/graphql'
import { View } from 'react-native'

import { useGridItemSize } from './grid/useGridItemSize'
import { useListRowItemSize } from './list/useListRowItemSize'

type Params = {
	layout: InterfaceLayout
}

type Return = {
	itemWidth: number
	itemHeight?: number
	estimatedItemHeight: number
	paddingHorizontal: number
	numColumns: number
} & Pick<FlashListProps<unknown>, 'ItemSeparatorComponent'>

export function useListSizing({ layout }: Params): Return {
	const gridSizing = useGridItemSize()
	const listSizing = useListRowItemSize()

	const variants = {
		[InterfaceLayout.Table]: {
			itemWidth: listSizing.width,
			itemHeight: listSizing.height,
			estimatedItemHeight: listSizing.height,
			paddingHorizontal: 0,
			numColumns: 1,
			ItemSeparatorComponent: () => <View className="h-6" />,
		},
		[InterfaceLayout.Grid]: {
			itemWidth: gridSizing.itemWidth,
			estimatedItemHeight: gridSizing.estimatedItemHeight,
			paddingHorizontal: gridSizing.paddingHorizontal,
			numColumns: gridSizing.numColumns,
			ItemSeparatorComponent: null,
		},
	}

	return variants[layout]
}
