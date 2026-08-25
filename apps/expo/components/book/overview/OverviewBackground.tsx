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

// TODO: Change all other places that use useOverviewAnimations
export function OverviewBackground({
	parallaxStyle,
	source,
}: {
	parallaxStyle: AnimatedStyle<ViewStyle>
	source: TurboImageProps['source']
}) {
	return (
		<Animated.View
			// -top-24 is because when using a lot of blur, the sides get more transparent
			// so we have to "zoom in" to have a clean line at the bottom rather than a gradient
			// https://github.com/duguyihou/react-native-turbo-image/issues/437
			className="-top-24 left-0 right-0 bottom-0 absolute opacity-70 dark:opacity-30"
			style={parallaxStyle}
		>
			<TurboImage
				source={source}
				style={{ width: '100%', height: '100%' }}
				// because we use uses "cover" and the image spans the whole screen rather than just the
				// thumbnail+read+progress area, the image might not look great on very very tall or very very wide screens
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
