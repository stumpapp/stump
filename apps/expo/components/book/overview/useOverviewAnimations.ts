import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollOffset,
} from 'react-native-reanimated'

export function useOverviewAnimations() {
	const animatedScrollRef = useAnimatedRef<Animated.ScrollView>()
	const scrollOffset = useScrollOffset(animatedScrollRef)
	const parallaxStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateY: interpolate(scrollOffset.value, [0, 200], [0, 100], Extrapolation.EXTEND) },
			],
		}
	})

	return { animatedScrollRef, parallaxStyle }
}
