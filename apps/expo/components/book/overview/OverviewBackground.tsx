import { useHeaderHeight } from 'expo-router/react-navigation'
import { Platform, ViewStyle } from 'react-native'
import Animated, {
	AnimatedStyle,
	Extrapolation,
	interpolate,
	useAnimatedRef,
	useAnimatedStyle,
	useScrollOffset,
} from 'react-native-reanimated'
import { TurboImageProps } from 'react-native-turbo-image'

import { TurboImage } from '~/components/image'

export function useOverviewAnimations() {
	const animatedScrollRef = useAnimatedRef<Animated.ScrollView>()
	const scrollOffset = useScrollOffset(animatedScrollRef)
	const headerHeight = useHeaderHeight()

	const parallaxStyle = useAnimatedStyle(() => {
		const resolvedScrollOffset = scrollOffset.value + headerHeight

		if (resolvedScrollOffset < 0) {
			return {
				transformOrigin: 'top',
				transform: [
					{ scale: interpolate(resolvedScrollOffset, [0, -200], [1, 1.2], Extrapolation.CLAMP) },
				],
			}
		}

		return {
			transform: [
				{
					translateY: interpolate(resolvedScrollOffset, [0, 200], [0, -100], Extrapolation.EXTEND),
				},
			],
		}
	})

	return { animatedScrollRef, parallaxStyle }
}

// TODO: Change the places that use useOverviewAnimations in sheets

// Note: If inside the ScrollView there are annoying issues with transformOrigin so instead we put
// the background outside the ScrollView, but if we use the device height, on very wide screens
// the real white/black background will scroll into view under the background image,
// so instead we measure the main section height on mount/layout change and use this.
// This way when the details/metadata section is initially below the screen edge it scrolls fine.
export function OverviewBackground({
	parallaxStyle,
	source,
	mainSectionHeight,
}: {
	parallaxStyle: AnimatedStyle<ViewStyle>
	source: TurboImageProps['source']
	mainSectionHeight: number | undefined
}) {
	const headerHeight = useHeaderHeight()

	return (
		<Animated.View
			className="absolute opacity-70 dark:opacity-30"
			style={[
				parallaxStyle,
				{
					// -80 is because when using a lot of blur, the sides get more transparent
					// so we have to "zoom in" to have a clean line at the bottom rather than a gradient,
					// and this value is derived from guessing by eye
					// https://github.com/duguyihou/react-native-turbo-image/issues/437
					height: !mainSectionHeight ? undefined : mainSectionHeight + headerHeight + 80 * 2,
					inset: -80,
				},
			]}
		>
			<TurboImage
				source={source}
				style={{ width: '100%', height: '100%' }}
				resizeMode="cover"
				fadeDuration={2000}
				// android only supports up to blur={25} which doesn't look good,
				// but if we heavily downscale first, the following looks near identical to using
				// original res with blur={40} on ios, which is what I originally settled on
				resize={60}
				blur={Platform.OS === 'ios' ? 7 : 16}
			/>
		</Animated.View>
	)
}
