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

	return { itemDimension, gap: resolvedGap, numColumns, sizeEstimate }
}
