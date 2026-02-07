import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export function useSmartListItemsSize() {
	const { width, isTablet, isLandscapeTablet } = useDisplay()

	const layout = usePreferencesStore((state) => state.smartListLayout)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const insets = useSafeAreaInsets()

	const availableSpace = width - insets.left - insets.right

	const gridColumns = isLandscapeTablet ? 6 : isTablet ? 4 : 2
	const numColumns = layout === 'grid' ? gridColumns : 1

	const itemWidth = useMemo(
		() =>
			layout === 'grid'
				? // space - padding - gaps
					(availableSpace - 32 - 16 * (numColumns - 1)) / numColumns
				: availableSpace - 32, //  16 padding on each side
		[availableSpace, layout, numColumns],
	)

	const thumbnailWidth = layout === 'grid' ? itemWidth : 90
	const thumbnailHeight = thumbnailWidth / thumbnailRatio

	// Here gap refers to the space on each side of a thumbnail, e.g. 4 items means 8 gaps (2 on each side)
	// and paddingH refers to the horizontal padding we will use in the flashlist for grids, so that the real horizontal padding equals 16px.
	//
	// paddingH + gap = 16
	// gap = (width - paddingH * 2 - itemDimension * numColumns) / (2 * numColumns)
	//
	// hence
	const paddingHorizontal =
		layout === 'grid'
			? (availableSpace - itemWidth * numColumns - 32 * numColumns) / (2 * (1 - numColumns))
			: 16 // Just fixed 16px padding for list layout since there are fewer sizing concerns

	return {
		itemWidth,
		thumbnailWidth,
		thumbnailHeight,
		numColumns,
		// Note: I don't use this on the entire list because the context menu per-item looks better if
		// the padding is _inside_ the menu trigger than outside
		paddingHorizontal,
	}
}
