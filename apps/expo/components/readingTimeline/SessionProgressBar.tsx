import { parseGraphQLPercentageDecimal } from '@stump/client'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { cn } from '~/lib/utils'

import { Text } from '../ui'
import { fakeData } from './fakeData'

const MIN_LABEL_GAP = 6

type Props = {
	session: (typeof fakeData.readthroughs)[number]['sessions'][number]['session']
	events: (typeof fakeData.readthroughs)[number]['sessions'][number]['events']
}

// TODO: will come back to this once other areas are more thought out, it was a very good and fun experiment
// but as-is skews kinda towards awkward ui. i do like the idea of the window progress bar that highlights
// the progress of a single session, rather than always anchoring to 0, but the way this is used (as a thing
// inside a card footer) might not work if session timeline is too complex and breaks from being contained
// in a single card
export function SessionProgressBar({ session, events }: Props) {
	const [trackWidth, setTrackWidth] = useState(0)

	// the widths of all the labels (top v bottom) initially set to a reasonable-ish
	// 20px so there is less jitter when first layout hits
	const [topStartWidth, setTopStartWidth] = useState(20)
	const [topEndWidth, setTopEndWidth] = useState(20)
	const [bottomStartWidth, setBottomStartWidth] = useState(20)
	const [bottomEndWidth, setBottomEndWidth] = useState(20)

	const startPercentage = parseGraphQLPercentageDecimal(session.startPercentage) ?? 0
	const endPercentage = parseGraphQLPercentageDecimal(session.endPercentage) ?? 0
	const start = startPercentage / 100
	const end = endPercentage / 100

	const clampedStart = Math.max(0, Math.min(1, start))
	const clampedEnd = Math.max(clampedStart, Math.min(1, end))

	const segmentLeft = useSharedValue(0)
	const segmentWidth = useSharedValue(0)

	useEffect(() => {
		if (trackWidth === 0) return
		segmentLeft.value = withSpring(clampedStart * trackWidth, { overshootClamping: true })
		segmentWidth.value = withSpring((clampedEnd - clampedStart) * trackWidth, {
			overshootClamping: true,
		})
	}, [trackWidth, clampedStart, clampedEnd, segmentLeft, segmentWidth])

	const segmentStyle = useAnimatedStyle(() => ({
		left: segmentLeft.value,
		width: segmentWidth.value,
	}))

	// session progress is effectively a window relative to the full book, so the start/end are
	// anchored to the actual section of progress made rather than e.g. 0%-endPercentage
	const startPx = trackWidth * clampedStart
	const endPx = trackWidth * clampedEnd

	const topPositions = computeLabelPositions(startPx, endPx, trackWidth, topStartWidth, topEndWidth)
	const bottomPositions = computeLabelPositions(
		startPx,
		endPx,
		trackWidth,
		bottomStartWidth,
		bottomEndWidth,
	)

	return (
		<View className={cn('gap-1.5')}>
			{trackWidth > 0 && (
				<View style={{ position: 'relative', height: 16 }}>
					<Text
						size="xs"
						className="text-foreground-muted absolute"
						style={{ left: topPositions.startLeft }}
						numberOfLines={1}
						onLayout={(e) => setTopStartWidth(e.nativeEvent.layout.width)}
					>
						{`p. ${session.startPage}`}
					</Text>
					<Text
						size="xs"
						className="text-foreground-muted absolute"
						style={{ right: topPositions.endRight }}
						numberOfLines={1}
						onLayout={(e) => setTopEndWidth(e.nativeEvent.layout.width)}
					>
						{`p. ${session.endPage}`}
					</Text>
				</View>
			)}

			<View
				className="h-2.5 bg-black/30 w-full overflow-hidden rounded-full"
				style={{ position: 'relative' }}
				onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
			>
				{/*TODO: arrow -> ? removed roundness in meantime*/}
				<Animated.View style={segmentStyle} className={cn('bg-white/70 absolute h-full')} />

				{/*TODO: chapter dots?*/}
			</View>

			{trackWidth > 0 && (
				<View style={{ position: 'relative', height: 16 }}>
					<Text
						size="xs"
						className="text-foreground-muted absolute"
						style={{ left: bottomPositions.startLeft }}
						numberOfLines={1}
						onLayout={(e) => setBottomStartWidth(e.nativeEvent.layout.width)}
					>
						{`${startPercentage.toFixed(1)}%`}
					</Text>
					<Text
						size="xs"
						className="text-foreground-muted absolute"
						style={{ right: bottomPositions.endRight }}
						numberOfLines={1}
						onLayout={(e) => setBottomEndWidth(e.nativeEvent.layout.width)}
					>
						{`${endPercentage.toFixed(1)}%`}
					</Text>
				</View>
			)}
		</View>
	)
}

// this took a bit for my brain to get right:
// in tiny sessions (or REALLY large books etc etc) the labels can collide, so we
// have to push them apart manually relative to the midpoint of the window. each
// label section (top v bottom) are tracked separately so they move only when they
// should (e.g., the bottom may collide while top does not)
function computeLabelPositions(
	startPx: number,
	endPx: number,
	trackWidth: number,
	startLabelWidth: number,
	endLabelWidth: number,
): { startLeft: number; endRight: number } {
	const wouldCollide = startPx + startLabelWidth + MIN_LABEL_GAP > endPx - endLabelWidth
	if (!wouldCollide) return { startLeft: startPx, endRight: trackWidth - endPx }

	const midPx = (startPx + endPx) / 2
	const startLeft = Math.max(0, midPx - MIN_LABEL_GAP / 2 - startLabelWidth)
	const endLabelLeftEdge = Math.max(
		startLeft + startLabelWidth + MIN_LABEL_GAP,
		midPx + MIN_LABEL_GAP / 2,
	)
	const endRight = Math.max(0, trackWidth - endLabelLeftEdge - endLabelWidth)

	return { startLeft, endRight }
}

// TODO: getChapterDotPositions ?
