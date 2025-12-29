import { useMemo } from 'react'
import { FlatListProps, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const FilterListSeparator = () => <View className="h-px bg-edge" />

type FilterListProps<T> = Pick<
	FlatListProps<T>,
	| 'ItemSeparatorComponent'
	| 'showsVerticalScrollIndicator'
	| 'removeClippedSubviews'
	| 'maxToRenderPerBatch'
	| 'initialNumToRender'
	| 'windowSize'
	| 'style'
	| 'contentContainerStyle'
	| 'stickyHeaderHiddenOnScroll'
>

export function useFilterListProps<T>(): FilterListProps<T> {
	const insets = useSafeAreaInsets()

	return useMemo(
		() =>
			({
				contentContainerStyle: { paddingBottom: insets.bottom + 24 },
				ItemSeparatorComponent: FilterListSeparator,
				showsVerticalScrollIndicator: false,
				removeClippedSubviews: true,
				maxToRenderPerBatch: 15,
				initialNumToRender: 20,
				windowSize: 5,
				// Note: It doesn't seem to work on Android for some reason, it hides
				// but won't restore when scrolling back up so I've disabled it
				stickyHeaderHiddenOnScroll: Platform.OS === 'ios',
			}) satisfies FilterListProps<T>,
		[insets.bottom],
	)
}
