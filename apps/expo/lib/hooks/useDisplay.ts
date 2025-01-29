import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function useDisplay() {
	const dimensions = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const isTablet = useMemo(() => dimensions.width >= 640, [dimensions.width])
	const isXSmall = useMemo(() => dimensions.width <= 375, [dimensions.width])
	const safeWidth = useMemo(
		() => dimensions.width - insets.left - insets.right,
		[dimensions.width, insets.left, insets.right],
	)

	return {
		...dimensions,
		isTablet,
		isXSmall,
		safeWidth,
	}
}
