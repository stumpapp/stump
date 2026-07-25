import { useEffect } from 'react'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedProps,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from 'react-native-reanimated'
import Svg, { Line } from 'react-native-svg'

type Props = {
	playing: boolean
	color: string
	size: number
}

const AnimatedLine = Animated.createAnimatedComponent(Line)

// ported from https://lucide-animated.com/ ty <3
//
// there is no earthly way i will remember this in a month, so here is an explanation:
//
// - the icon derived from lucide, with six vertical lines at x = 2, 6, 10, 14, 18, 22
// - the two outer lines are static (ez), and the four inner lines are animated
// - animation goes by shifting top/bottom of each line to make it appear to compress/expand
// - no line has same resting height or speed, so they give kinda breathing effect
export function AnimatedAudioLines({ playing, color, size }: Props) {
	const line1Top = useSharedValue(6)
	const line1Bottom = useSharedValue(17)
	const line2Top = useSharedValue(3)
	const line2Bottom = useSharedValue(21)
	const line3Top = useSharedValue(8)
	const line3Bottom = useSharedValue(15)
	const line4Top = useSharedValue(5)
	const line4Bottom = useSharedValue(18)

	useEffect(() => {
		const ease = { easing: Easing.inOut(Easing.ease) }
		if (playing) {
			// line 1 = top/bottom squish together and back out
			line1Top.value = withRepeat(
				withSequence(
					withTiming(10, { duration: 750, ...ease }),
					withTiming(6, { duration: 750, ...ease }),
				),
				-1,
			)
			line1Bottom.value = withRepeat(
				withSequence(
					withTiming(13, { duration: 750, ...ease }),
					withTiming(17, { duration: 750, ...ease }),
				),
				-1,
			)
			// line 2 = same as line 1 but faster and diff heights
			line2Top.value = withRepeat(
				withSequence(
					withTiming(9, { duration: 500, ...ease }),
					withTiming(3, { duration: 500, ...ease }),
				),
				-1,
			)
			line2Bottom.value = withRepeat(
				withSequence(
					withTiming(14, { duration: 500, ...ease }),
					withTiming(21, { duration: 500, ...ease }),
				),
				-1,
			)
			// line 3 = top/bottom push outward and back in
			line3Top.value = withRepeat(
				withSequence(
					withTiming(6, { duration: 400, ...ease }),
					withTiming(8, { duration: 400, ...ease }),
				),
				-1,
			)
			line3Bottom.value = withRepeat(
				withSequence(
					withTiming(17, { duration: 400, ...ease }),
					withTiming(15, { duration: 400, ...ease }),
				),
				-1,
			)
			// line 4 = basically line 1 but slower and diff heights
			line4Top.value = withRepeat(
				withSequence(
					withTiming(7, { duration: 750, ...ease }),
					withTiming(5, { duration: 750, ...ease }),
				),
				-1,
			)
			line4Bottom.value = withRepeat(
				withSequence(
					withTiming(16, { duration: 750, ...ease }),
					withTiming(18, { duration: 750, ...ease }),
				),
				-1,
			)
		} else {
			cancelAnimation(line1Top)
			cancelAnimation(line1Bottom)
			cancelAnimation(line2Top)
			cancelAnimation(line2Bottom)
			cancelAnimation(line3Top)
			cancelAnimation(line3Bottom)
			cancelAnimation(line4Top)
			cancelAnimation(line4Bottom)
			line1Top.value = withTiming(6, { duration: 200 })
			line1Bottom.value = withTiming(17, { duration: 200 })
			line2Top.value = withTiming(3, { duration: 200 })
			line2Bottom.value = withTiming(21, { duration: 200 })
			line3Top.value = withTiming(8, { duration: 200 })
			line3Bottom.value = withTiming(15, { duration: 200 })
			line4Top.value = withTiming(5, { duration: 200 })
			line4Bottom.value = withTiming(18, { duration: 200 })
		}
	}, [
		playing,
		line1Top,
		line1Bottom,
		line2Top,
		line2Bottom,
		line3Top,
		line3Bottom,
		line4Top,
		line4Bottom,
	])

	const line1Props = useAnimatedProps(() => ({ y1: line1Top.value, y2: line1Bottom.value }))
	const line2Props = useAnimatedProps(() => ({ y1: line2Top.value, y2: line2Bottom.value }))
	const line3Props = useAnimatedProps(() => ({ y1: line3Top.value, y2: line3Bottom.value }))
	const line4Props = useAnimatedProps(() => ({ y1: line4Top.value, y2: line4Bottom.value }))

	const sharedLineProps = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const }

	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Line x1={2} y1={10} x2={2} y2={13} {...sharedLineProps} />
			<AnimatedLine x1={6} x2={6} animatedProps={line1Props} {...sharedLineProps} />
			<AnimatedLine x1={10} x2={10} animatedProps={line2Props} {...sharedLineProps} />
			<AnimatedLine x1={14} x2={14} animatedProps={line3Props} {...sharedLineProps} />
			<AnimatedLine x1={18} x2={18} animatedProps={line4Props} {...sharedLineProps} />
			<Line x1={22} y1={10} x2={22} y2={13} {...sharedLineProps} />
		</Svg>
	)
}
