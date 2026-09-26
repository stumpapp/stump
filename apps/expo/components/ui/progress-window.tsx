import * as React from 'react'
import { LayoutChangeEvent, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { cn } from '~/lib/utils'

import { Text } from './text'

const SPRING_CONFIG = { overshootClamping: true } as const

/** A position + optional title for a chapter boundary marker on the track */
export type ProgressWindowChapterMark = {
	/** Position as a 0–1 fraction of the total book length */
	position: number
	title?: string
}

type Props = {
	/** Start of the reading window as a 0–1 fraction */
	start: number
	/** End of the reading window as a 0–1 fraction */
	end: number
	/** Text rendered above the left edge of the window (e.g. start page number) */
	startLabel?: string
	/** Text rendered above the right edge of the window (e.g. end page number) */
	endLabel?: string
	/** Text rendered below the left edge of the window (e.g. start percentage) */
	startSubLabel?: string
	/** Text rendered below the right edge of the window (e.g. end percentage) */
	endSubLabel?: string
	/** Chapter boundary markers rendered as hairline ticks on the track */
	chapterMarks?: ProgressWindowChapterMark[]
	indicatorClassName?: string
	trackClassName?: string
	className?: string
}

/**
 * A ranged progress bar that fills only the slice `start → end` of the track rather than
 * filling from zero. Useful for visualising a single reading session's window within the
 * full book.
 *
 * Labels are anchored to the edges of the filled segment:
 * - `startLabel` / `endLabel` float above the left and right edges respectively
 * - `startSubLabel` / `endSubLabel` float below them
 *
 * Optional `chapterMarks` render as hairline ticks along the track at their given 0–1
 * positions. The data for these isn't available yet — pass an empty array or omit the
 * prop until the backend exposes chapter positions.
 */
export function ProgressWindow({
	start,
	end,
	startLabel,
	endLabel,
	startSubLabel,
	endSubLabel,
	chapterMarks,
	indicatorClassName,
	trackClassName,
	className,
}: Props) {
	// Measured width of the track View, used to convert 0–1 fractions to pixel positions
	// for both the animated segment and the label layout.
	const [trackWidth, setTrackWidth] = React.useState(0)

	const clampedStart = Math.max(0, Math.min(1, start))
	const clampedEnd = Math.max(clampedStart, Math.min(1, end))

	// Shared values drive the spring animation on the segment. We update them whenever
	// the track width or the start/end fractions change.
	const segmentLeft = useSharedValue(0)
	const segmentWidth = useSharedValue(0)

	React.useEffect(() => {
		if (trackWidth === 0) return
		segmentLeft.value = withSpring(clampedStart * trackWidth, SPRING_CONFIG)
		segmentWidth.value = withSpring((clampedEnd - clampedStart) * trackWidth, SPRING_CONFIG)
	}, [trackWidth, clampedStart, clampedEnd, segmentLeft, segmentWidth])

	const segmentStyle = useAnimatedStyle(() => ({
		left: segmentLeft.value,
		width: segmentWidth.value,
	}))

	// Pixel positions used for static label placement. Derived from the same source as
	// the animation, but as plain numbers so they can be used directly in RN style objects.
	const startPx = trackWidth * clampedStart
	const endPx = trackWidth * clampedEnd

	const hasTopLabels = startLabel != null || endLabel != null
	const hasBottomLabels = startSubLabel != null || endSubLabel != null

	/** Renders a label row with one text anchored to `startPx` and another to `endPx`. */
	const renderLabelRow = (leftText: string | undefined, rightText: string | undefined) => (
		<View style={{ position: 'relative', height: 16 }}>
			{leftText != null && (
				<Text
					size="xs"
					className="text-foreground-muted absolute"
					style={{ left: startPx }}
					numberOfLines={1}
				>
					{leftText}
				</Text>
			)}
			{rightText != null && (
				<Text
					size="xs"
					className="text-foreground-muted absolute text-right"
					// `right` in absolute positioning is distance from the parent's right edge,
					// so `trackWidth - endPx` places the label's right edge at `endPx`.
					style={{ right: trackWidth - endPx }}
					numberOfLines={1}
				>
					{rightText}
				</Text>
			)}
		</View>
	)

	return (
		<View className={cn('gap-0.5', className)}>
			{hasTopLabels && trackWidth > 0 && renderLabelRow(startLabel, endLabel)}

			<View
				className={cn(
					'h-1.5 bg-background-surface-secondary w-full overflow-hidden rounded-full',
					trackClassName,
				)}
				style={{ position: 'relative' }}
				onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
			>
				<Animated.View
					style={segmentStyle}
					className={cn('absolute h-full rounded-full bg-foreground', indicatorClassName)}
				/>

				{chapterMarks?.map((mark, i) => (
					<View
						key={i}
						className="absolute h-full w-px bg-background/40"
						style={{ left: mark.position * trackWidth }}
					/>
				))}
			</View>

			{hasBottomLabels && trackWidth > 0 && renderLabelRow(startSubLabel, endSubLabel)}
		</View>
	)
}
