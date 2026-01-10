import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'

type Params = {
	horizontalGap?: number
	verticalGap?: number
	padding?: number
}

const defaultParams = {
	horizontalGap: 16,
	verticalGap: 16,
	padding: 16 * 2,
}

export function useLibraryItemSize(params: Params = {}) {
	const { width, isTablet } = useDisplay()

	const insets = useSafeAreaInsets()

	const numColumns = useMemo(() => (isTablet ? 2 : 1), [isTablet])
	const availableSpace = width - insets.left - insets.right

	const { horizontalGap, verticalGap, padding } = { ...defaultParams, ...params }

	const resolvedVerticalGap = useMemo(
		() => (isTablet ? verticalGap : verticalGap * 0.8),
		[isTablet, verticalGap],
	)

	const itemWidth = useMemo(
		() => (availableSpace - padding - horizontalGap * (numColumns - 1)) / numColumns,
		[availableSpace, padding, horizontalGap, numColumns],
	)

	// Here gap refers to the space on each side of a thumbnail, e.g. 4 items means 8 gaps (2 on each side)
	// and paddingH refers to the horizontal padding we will use in the flashlist for grids, so that the real horizontal padding equals 16px.
	//
	// paddingH + gap = 16
	// gap = (width - paddingH * 2 - itemDimension * numColumns) / (2 * numColumns)
	//
	// hence
	const paddingHorizontal =
		(availableSpace - itemWidth * numColumns - 32 * numColumns) / (2 * (1 - numColumns))

	return {
		itemWidth,
		horizontalGap,
		verticalGap: resolvedVerticalGap,
		paddingHorizontal,
		numColumns,
	}
}
