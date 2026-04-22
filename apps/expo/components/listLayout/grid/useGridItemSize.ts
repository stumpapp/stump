import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'

type Params = {
	horizontalGap?: number
	padding?: number
	numColumns?: number
}

const defaultParams = {
	horizontalGap: 16,
	padding: 16 * 2,
}

export function useGridItemSize(params: Params = {}) {
	const { width, isTablet, isLandscapeTablet } = useDisplay()

	const insets = useSafeAreaInsets()

	const numColumns = useMemo(() => {
		if (params.numColumns) {
			return params.numColumns
		} else {
			return isLandscapeTablet ? 6 : isTablet ? 4 : 2
		}
	}, [isTablet, isLandscapeTablet, params.numColumns])
	const availableSpace = width - insets.left - insets.right

	const { horizontalGap, padding } = { ...defaultParams, ...params }

	const itemWidth = useMemo(
		() => (availableSpace - padding - horizontalGap * (numColumns - 1)) / numColumns,
		[availableSpace, padding, horizontalGap, numColumns],
	)
	const sizeEstimate = itemWidth * 1.5 + 16 + 20 + 4 * 2

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
		paddingHorizontal,
		numColumns,
		sizeEstimate,
	}
}
