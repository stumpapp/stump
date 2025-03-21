import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function useDisplay() {
	const dimensions = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const isLandscape = useMemo(
		() => dimensions.width > dimensions.height,
		[dimensions.width, dimensions.height],
	)
	const isTablet = useMemo(() => dimensions.width >= 640, [dimensions.width])
	const isLandscapeTablet = useMemo(
		() => isLandscape && dimensions.height >= 640,
		[isLandscape, dimensions.height],
	)
	const isXSmall = useMemo(() => dimensions.width <= 375, [dimensions.width])
	const safeWidth = useMemo(
		() => dimensions.width - insets.left - insets.right,
		[dimensions.width, insets.left, insets.right],
	)

	return {
		...dimensions,
		isTablet,
		isLandscape,
		isLandscapeTablet,
		isXSmall,
		safeWidth,
	}
}
