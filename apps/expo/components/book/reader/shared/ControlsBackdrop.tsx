import { useEffect, useMemo } from 'react'
import { Easing, Pressable } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'
import Animated, {
	Easing as RNREasing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'

import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'

export default function ControlsBackdrop() {
	const controls = useReaderStore((state) => ({
		isVisible: state.showControls,
		setVisible: state.setShowControls,
	}))

	const animatedOpacity = useSharedValue(controls.isVisible ? 1 : 0)
	useEffect(() => {
		animatedOpacity.value = withTiming(controls.isVisible ? 1 : 0, {
			duration: 250,
			easing: RNREasing.out(RNREasing.quad),
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [controls.isVisible])

	const containerStyles = useAnimatedStyle(() => {
		return {
			opacity: animatedOpacity.value,
			display: animatedOpacity.value === 0 ? 'none' : 'flex',
		}
	})

	const { colors: gradientColors, locations: gradientLocations } = useMemo(
		() =>
			easeGradient({
				colorStops: {
					0: { color: 'rgba(0, 0, 0, 0.8)' },
					0.4: { color: 'rgba(0, 0, 0, 0.50)' },
					0.6: { color: 'rgba(0, 0, 0, 0.50)' },
					1: { color: 'rgba(0, 0, 0, 0.8)' },
				},
				extraColorStopsPerTransition: 16,
				easing: Easing.bezier(0.62, 0, 0.38, 1), // https://cubic-bezier.com/#.62,0,.38,1
			}),
		[],
	)

	return (
		<Animated.View className={cn('absolute inset-0 z-10 flex-1')} style={containerStyles}>
			<Pressable onPress={() => controls.setVisible(false)} style={{ flex: 1 }}>
				<LinearGradient colors={gradientColors} locations={gradientLocations} style={{ flex: 1 }} />
			</Pressable>
		</Animated.View>
	)
}
