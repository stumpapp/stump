import { useEffect, useMemo } from 'react'
import { Platform } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'
import { CONTROLS_TIMING_CONFIG } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { usePdfStore } from '~/stores/pdf'

export const FOOTER_HEIGHT = 48

// TODO: Determine where to display read time:
// const elapsedSeconds = useBookReadTime(book.id)

export function PdfReaderFooter() {
	const { height } = useDisplay()

	const visible = useReaderStore((state) => state.showControls)
	const position = usePdfStore((state) => ({
		page: state.currentPage,
		totalPages: state.book?.pages,
	}))

	const insets = useSafeAreaInsets()

	const opacity = useSharedValue(0)
	useEffect(() => {
		opacity.value = withTiming(visible ? 1 : 0, CONTROLS_TIMING_CONFIG)
	}, [visible, opacity, height, insets.bottom])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			bottom: insets.bottom + (Platform.OS === 'android' ? 12 : 0),
			left: insets.left,
			right: insets.right,
			opacity: opacity.value,
		}
	})

	const formattedPosition = useMemo(() => {
		if (!position.page) return null
		if (!position.totalPages) return `${position.page}`
		if (position.page < position.totalPages) {
			return `${position.page} of ${position.totalPages}`
		} else {
			return `${position.page}`
		}
	}, [position])

	return (
		<Animated.View
			className="absolute z-20 h-12 flex-row items-center justify-center gap-2 px-2"
			style={animatedStyles}
		>
			<Text
				className="font-medium"
				style={{
					color: 'white',
				}}
			>
				{formattedPosition}
			</Text>
		</Animated.View>
	)
}
