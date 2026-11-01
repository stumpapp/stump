import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatNarrowDuration } from '@stump/i18n'
import { format, setDay } from 'date-fns'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { usePalette } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

const fragment = graphql(`
	fragment WeekdayChart on ReadingStats {
		dayOfWeek {
			isoWeekday
			averageSeconds
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

function weekdayLabel(isoWeekday: number): string {
	return format(setDay(new Date(), isoWeekday % 7), 'EEE')
}

export function WeekdayChart({ fragmentRef }: Props) {
	const { locale } = useTranslate()

	const data = useFragment(fragment, fragmentRef)

	const weekdays = data.dayOfWeek.map((day) => ({
		key: `iso-day-${day.isoWeekday}`,
		label: weekdayLabel(day.isoWeekday),
		value: formatNarrowDuration(day.averageSeconds, { significantUnits: 1, locale }),
		seconds: day.averageSeconds,
	}))

	const max = Math.max(1, ...weekdays.map((day) => day.seconds))

	return (
		<View className="p-4 gap-2 flex-row items-end">
			{weekdays.map((day) => (
				<View key={day.key} className="gap-1.5 flex-1 items-center">
					<Text size="xs" className="text-foreground-muted" numberOfLines={1}>
						{day.seconds > 0 ? day.value : ''}
					</Text>

					<WeekdayBar max={max} seconds={day.seconds} />

					<Text size="sm" className="font-medium">
						{day.label}
					</Text>
				</View>
			))}
		</View>
	)
}

type WeekdayBarProps = {
	max: number
	seconds: number
}

const BAR_HEIGHT = 95

function WeekdayBar({ max, seconds }: WeekdayBarProps) {
	const accentColor = usePalette('accent')

	const height = useSharedValue(0)

	useEffect(() => {
		const percentage = Math.max(4 / BAR_HEIGHT, seconds / max)
		height.value = withSpring(BAR_HEIGHT * percentage, { overshootClamping: true })
	}, [max, seconds, height])

	const style = useAnimatedStyle(() => ({
		height: height.value,
	}))

	return (
		<View
			className="w-full items-center justify-end"
			style={{
				height: BAR_HEIGHT + 12,
			}}
		>
			<Animated.View
				className="squircle w-3/5 rounded-lg"
				style={[
					style,
					{
						backgroundColor: accentColor,
						// height: `${Math.max(4, (seconds / max) * 100)}%`,
						// ^ basically normalizing them all as percentages of max
						// with a clamp so all are visible
						opacity: seconds > 0 ? 1 : 0.2,
					},
				]}
			/>
		</View>
	)
}
