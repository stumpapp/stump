import { useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDisplay } from '~/lib/hooks'

type Params = {
	gap?: number
	padding?: number
}

const defaultParams = {
	gap: 8,
	padding: 16 * 2,
}

export function useGridItemSize(params: Params = {}) {
	const { width, isTablet, isLandscapeTablet } = useDisplay()

	const insets = useSafeAreaInsets()

	const numColumns = useMemo(
		() => (isLandscapeTablet ? 6 : isTablet ? 4 : 2),
		[isTablet, isLandscapeTablet],
	)
	const availableSpace = width - insets.left - insets.right

	const { gap, padding } = { ...defaultParams, ...params }

	const resolvedGap = useMemo(() => (isLandscapeTablet ? gap * 2 : gap), [isLandscapeTablet, gap])

	const itemDimension = useMemo(
		() => (availableSpace - padding - resolvedGap * (numColumns + 1)) / numColumns,
		[availableSpace, padding, resolvedGap, numColumns],
	)
	const sizeEstimate = itemDimension * 1.5 + 16 + 20 + 4 * 2

	// Here gap refers to the space on each side of a thumbnail, e.g. 4 items means 8 gaps (2 on each side)
	// and paddingH refers to the horizontal padding we will use in the flashlist for grids, so that the real horizontal padding equals 16px.
	//
	// paddingH + gap = 16
	// gap = (width - paddingH * 2 - thumbnailWidth * numColumns) / (2 * numColumns)
	//
	// hence
	const thumbnailWidth = itemDimension + 0.5 * 2 // add the border width on each side of a GridImageItem (should be 0.3, but 0.5 is what seems to actually work...)
	const paddingHorizontal =
		(width - thumbnailWidth * numColumns - 32 * numColumns) / (2 * (1 - numColumns))

	return {
		itemDimension,
		gap: resolvedGap,
		paddingHorizontal,
		numColumns,
		sizeEstimate,
	}
}
