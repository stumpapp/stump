import { NewCard, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatNarrowDuration } from '@stump/i18n'
import { format, parse } from 'date-fns'
import { useMemo } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import { buildDays, toLevel } from './range'

const fragment = graphql(`
	fragment ReadingStatsDailyActivity on ReadingStats {
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

/**
 * The opacity for each activity level, where level 0 is a day without any reading
 */
const LEVEL_OPACITY = [0.25, 0.45, 0.65, 0.85, 1]

const formatDay = (date: string) => format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d')

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export default function DailyActivityGrid({ fragmentRef }: Props) {
	const { translate, locale } = useTranslate()

	const stats = useFragment(fragment, fragmentRef)
	const { start, end } = stats.range

	const days = useMemo(() => {
		if (!start) return null
		const secondsByDate = new Map(stats.dailyActivity.map((day) => [day.date, day.totalSeconds]))
		return buildDays(start, end, secondsByDate)
	}, [start, end, stats.dailyActivity])

	// no point showing activity for an unbounded start of range (i.e., lifetime)
	if (!days || !start) return null

	const max = Math.max(0, ...days.map((day) => day.seconds))
	const dateRange = translate('shared.common.time.dateRange', {
		startDate: formatDay(start),
		endDate: formatDay(end),
	})

	return (
		<NewCard label={translate('shared.readingStats.dailyActivity')}>
			<div className="gap-3 p-4 flex flex-col">
				<div className="gap-1.5 flex flex-wrap" role="img" aria-label={dateRange}>
					{days.map((day) => (
						<span
							key={day.date}
							aria-hidden
							title={`${formatDay(day.date)}: ${formatNarrowDuration(day.seconds, { significantUnits: 2, locale })}`}
							className={
								day.seconds > 0
									? 'h-3 w-3 rounded-full bg-primary'
									: 'h-3 w-3 rounded-full bg-muted-foreground'
							}
							style={{ opacity: LEVEL_OPACITY[toLevel(day.seconds, max)] }}
						/>
					))}
				</div>

				<div className="gap-2 flex flex-wrap items-center justify-between">
					<Text size="sm" variant="muted">
						{dateRange}
					</Text>

					<div className="gap-1 flex items-center" aria-hidden>
						<Text size="sm" variant="muted" className="mr-1">
							{translate('shared.common.less')}
						</Text>
						{LEVEL_OPACITY.map((opacity, level) => (
							<span
								key={level}
								className={
									level === 0
										? 'h-3 w-3 rounded-full bg-muted-foreground'
										: 'h-3 w-3 rounded-full bg-primary'
								}
								style={{ opacity }}
							/>
						))}
						<Text size="sm" variant="muted" className="ml-1">
							{translate('shared.common.more')}
						</Text>
					</div>
				</div>
			</div>
		</NewCard>
	)
}
