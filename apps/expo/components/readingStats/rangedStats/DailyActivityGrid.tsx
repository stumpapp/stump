import { Canvas, Circle } from '@shopify/react-native-skia'
import { DailyActivityGridFragment, FragmentType, graphql, useFragment } from '@stump/graphql'
import { addDays, format, isAfter, parse } from 'date-fns'
import { useMemo, useState } from 'react'
import { View } from 'react-native'

import { Card, Text } from '~/components/ui'
import { useColors, usePalette } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

const fragment = graphql(`
	fragment DailyActivityGrid on ReadingStats {
		range {
			start
			end
		}
		dailyActivity {
			date
			totalSeconds
			sessionCount
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

// TODO: animate dots on mount?

export function DailyActivityGrid({ fragmentRef }: Props) {
	const { translate } = useTranslate()

	const stats = useFragment(fragment, fragmentRef)

	const days = useMemo(() => {
		if (!stats?.range.start) return null
		const secondsByDate = new Map(stats.dailyActivity.map((day) => [day.date, day.totalSeconds]))
		return buildDays(stats.range.start, stats.range.end, secondsByDate)
	}, [stats])

	// no point showing activity if no days, nor unbounded start of range (i.e., lifetime)
	if (!days || !stats.range.start) return null

	return (
		<Card label={translate('shared.readingStats.dailyActivity')}>
			<View className="p-4">
				<DotGrid days={days} range={stats.range} />
			</View>
		</Card>
	)
}

type DotGridDay = {
	date: string
	seconds: number
}

// TODO: this does mean that on dec 31st we'd have 365ish dots, which is
// a lot. its fine for now, i like this aesthetic but it might have to
// be more of a traditional cal heatmap if folks don't like or it isn't clear
// enough etc etc. i tried to avoid pulling in chart deps because honestly
// i haven't loved a lot of what i saw :/
// maybe if dots are clickable it could help? ish? idk
export function buildDays(
	start: string,
	end: string,
	secondsByDate: Map<string, number>,
): DotGridDay[] {
	const days: DotGridDay[] = []
	const today = new Date()
	const endDate = parse(end, 'yyyy-MM-dd', today)

	// keep adding dates until we are >= the end, advancing by
	// one day each iteration
	for (
		let cursor = parse(start, 'yyyy-MM-dd', today);
		!isAfter(cursor, endDate);
		cursor = addDays(cursor, 1)
	) {
		const date = format(cursor, 'yyyy-MM-dd')
		days.push({
			date,
			seconds: secondsByDate.get(date) ?? 0,
		})
	}

	return days
}

const formatDay = (date: string) => format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d')

const LEVEL_OPACITY = [0.25, 0.45, 0.65, 0.85, 1]

type DotGridProps = {
	days: DotGridDay[]
	range: DailyActivityGridFragment['range']
}

function DotGrid({ days, range }: DotGridProps) {
	const { translate } = useTranslate()

	const colors = useColors()
	const accentColor = usePalette('accent')

	const [width, setWidth] = useState(0)

	// TODO: dynamic by width of disaply?
	const columns = 20

	const cell = width / columns
	const radius = cell * 0.36
	const rows = Math.ceil(days.length / columns)
	const max = Math.max(1, ...days.map((day) => day.seconds))

	return (
		<View className="gap-3">
			<View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
				<Canvas style={{ width, height: rows * cell }}>
					{days.map((day, index) => (
						<Circle
							key={day.date}
							cx={(index % columns) * cell + cell / 2}
							// ^ modulo for which col i am in + maths for center of circle
							cy={Math.floor(index / columns) * cell + cell / 2}
							// ^ floor division for which row i am in + same center of circle maths
							r={radius}
							color={day.seconds > 0 ? accentColor : colors.foreground.muted}
							opacity={LEVEL_OPACITY[toLevel(day.seconds, max)]}
						/>
					))}
				</Canvas>
			</View>

			<View className="flex-row items-center justify-between">
				<Text size="sm" className="text-foreground-muted">
					{translate('shared.common.time.dateRange', {
						startDate: formatDay(range.start),
						endDate: formatDay(range.end),
					})}
				</Text>

				<View className="gap-1 flex-row items-center">
					<Text size="sm" className="text-foreground-muted mr-1">
						{translate('shared.common.less')}
					</Text>

					{LEVEL_OPACITY.map((opacity, level) => (
						<View
							key={level}
							className="h-3 w-3 rounded-full"
							style={{
								backgroundColor: level === 0 ? colors.foreground.muted : accentColor,
								opacity,
							}}
						/>
					))}

					<Text size="sm" className="text-foreground-muted ml-1">
						{translate('shared.common.more')}
					</Text>
				</View>
			</View>
		</View>
	)
}

function toLevel(seconds: number, max: number) {
	if (seconds <= 0) return 0
	return Math.min(4, Math.ceil((seconds / max) * 4))
}
