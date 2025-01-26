import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'

export function useDisplay() {
	const dimensions = useWindowDimensions()

	const isTablet = useMemo(() => dimensions.width >= 640, [dimensions.width])

	return {
		...dimensions,
		isTablet,
	}
}
