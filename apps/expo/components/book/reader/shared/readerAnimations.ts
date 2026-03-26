import { useEffect } from 'react'
import {
	Easing,
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'

import { useReaderStore } from '~/stores'

export function useReaderAnimations() {
	const showControls = useReaderStore((state) => state.showControls)

	const primaryOpacity = useSharedValue(1) // what shows when the controls are hidden
	const secondaryOpacity = useSharedValue(0) // what shows with the controls
	const translateYFooter = useSharedValue(50)

	useEffect(() => {
		primaryOpacity.value = withTiming(showControls ? 0 : 1, FADE_TIMING_CONFIG)
		secondaryOpacity.value = withTiming(showControls ? 1 : 0, FADE_TIMING_CONFIG)
		translateYFooter.value = withTiming(showControls ? 0 : 50, {
			duration: DURATION,
			easing: showControls
				? Easing.out(Easing.quad) // slow near the start
				: Easing.in(Easing.quad), // slow near the end
		})
	}, [showControls, primaryOpacity, translateYFooter, secondaryOpacity])

	const primaryStyle = useAnimatedStyle(() => ({ opacity: primaryOpacity.value }))
	const secondaryStyle = useAnimatedStyle(() => ({ opacity: secondaryOpacity.value }))
	const translateFooterStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateYFooter.value }],
	}))

	return { primaryStyle, secondaryStyle, translateFooterStyle }
}

// Note: It seems to take the ios status bar 350ms to fade in and out,
// and Easing.inOut(Easing.quad) seems to match the easing close enough.
// Android could have anything so this is fine.
const DURATION = 350
const FADE_EASING = Easing.inOut(Easing.quad)

export const FADE_TIMING_CONFIG = { duration: DURATION, easing: FADE_EASING }
export const FADE_IN = FadeIn.duration(DURATION).easing(FADE_EASING)
export const FADE_OUT = FadeOut.duration(DURATION).easing(FADE_EASING)
