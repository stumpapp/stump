import { useHeaderHeight } from '@react-navigation/elements'
import { Easing, Platform } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import {
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '~/lib/constants'

export function useAnimatedHeader() {
	const insets = useSafeAreaInsets()

	const isAtTop = useSharedValue(true)
	const colors = useColors()

	const iosHeaderHeight = useHeaderHeight() // this is not getting the correct android height so
	const androidHeaderHeight = insets.top + 56 // inset + default android header height
	const headerHeight = Platform.OS === 'ios' ? iosHeaderHeight : androidHeaderHeight

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0: { color: colors.header.start },

			1: { color: colors.header.end },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.55, 0, 0.4, 1), // https://cubic-bezier.com/#.55,0,.4,1 e.g. dark mode: stay dark, transition smoothly, then stay transparent
	})

	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (event) => {
			const offset = event.contentOffset.y

			const headingBoundary = -insets.top + 8

			if (offset > headingBoundary && isAtTop.value) {
				isAtTop.value = false
			} else if (offset <= headingBoundary && !isAtTop.value) {
				isAtTop.value = true
			}
		},
	})

	const scrollHandlerNonWorklet = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
		const offset = event.nativeEvent.contentOffset.y

		const headingBoundary = -insets.top + 8

		if (offset > headingBoundary && isAtTop.value) {
			isAtTop.value = false
		} else if (offset <= headingBoundary && !isAtTop.value) {
			isAtTop.value = true
		}
	}

	const headerStyle = useAnimatedStyle(() => {
		return {
			opacity: withTiming(isAtTop.value ? 1 : 0, { duration: 300 }),
		}
	})

	return {
		scrollHandler,
		scrollHandlerNonWorklet,
		headerStyle,
		gradientColors,
		gradientLocations,
		headerHeight,
	}
}

export const useResolvedHeaderHeight = () => {
	const insets = useSafeAreaInsets()
	const iosHeaderHeight = useHeaderHeight() // this is not getting the correct android height so
	const androidHeaderHeight = insets.top + 56 // inset + default android header height
	const headerHeight = Platform.OS === 'ios' ? iosHeaderHeight : androidHeaderHeight

	return headerHeight
}
