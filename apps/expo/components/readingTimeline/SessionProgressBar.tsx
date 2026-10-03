import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { cn } from '~/lib/utils'

type Props = {
	startPercentage: number // 0-100
	endPercentage: number // 0-100
}

export function SessionProgressBar({ startPercentage, endPercentage }: Props) {
	const [trackWidth, setTrackWidth] = useState(0)

	const start = startPercentage / 100
	const end = endPercentage / 100

	const clampedStart = Math.max(0, Math.min(1, start))
	const clampedEnd = Math.max(clampedStart, Math.min(1, end))

	const segmentLeft = useSharedValue(0)
	const segmentWidth = useSharedValue(0)

	useEffect(() => {
		if (trackWidth === 0) return
		segmentLeft.value = withSpring(clampedStart * trackWidth, { overshootClamping: true })
		let newWidth = (clampedEnd - clampedStart) * trackWidth
		// otherwise it basically is invisible
		if (newWidth < 1) newWidth = 1
		segmentWidth.value = withSpring(newWidth, {
			overshootClamping: true,
		})
	}, [trackWidth, clampedStart, clampedEnd, segmentLeft, segmentWidth])

	const segmentStyle = useAnimatedStyle(() => ({
		left: segmentLeft.value,
		width: segmentWidth.value,
	}))

	const previouslyReadSegment = useAnimatedStyle(() => ({
		left: 0,
		width: segmentLeft.value,
	}))

	return (
		<View
			className="h-2.5 bg-black/30 dark:bg-white/10 w-full overflow-hidden rounded-full"
			style={{ position: 'relative' }}
			onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
		>
			{/*TODO: a crosshatch or something would look neat to better distinguish*/}
			<Animated.View
				style={previouslyReadSegment}
				className={cn('bg-black/10 dark:bg-white/10 absolute h-full overflow-hidden')}
			/>
			<Animated.View style={segmentStyle} className={cn('bg-white/70 absolute h-full')} />
		</View>
	)
}
