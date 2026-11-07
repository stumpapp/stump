import { Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatNarrowDuration } from '@stump/i18n'
import { format, setDay } from 'date-fns'

import { useTranslate } from '@/hooks/useTranslate'

const fragment = graphql(`
	fragment ReadingStatsWeekday on ReadingStats {
		dayOfWeek {
			isoWeekday
			averageSeconds
		}
	}
`)

/**
 * The height (px) of the tallest bar, all others are relative to it
 */
const BAR_HEIGHT = 96
/**
 * The min height (px) of a bar so days without reading are still visible
 */
const MIN_BAR_HEIGHT = 4

function weekdayLabel(isoWeekday: number): string {
	return format(setDay(new Date(), isoWeekday % 7), 'EEE')
}

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export default function WeekdayChart({ fragmentRef }: Props) {
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
		<div className="gap-2 p-4 flex items-end">
			{weekdays.map((day) => (
				<div key={day.key} className="gap-1.5 flex flex-1 flex-col items-center">
					<Text size="xs" variant="muted" className="min-h-4 line-clamp-1">
						{day.seconds > 0 ? day.value : null}
					</Text>

					<div className="flex w-full items-end justify-center" style={{ height: BAR_HEIGHT }}>
						<div
							className="max-w-12 w-3/5 rounded-lg bg-primary transition-[height]"
							style={{
								height: Math.max(MIN_BAR_HEIGHT, (day.seconds / max) * BAR_HEIGHT),
								opacity: day.seconds > 0 ? 1 : 0.2,
							}}
						/>
					</div>

					<Text size="sm" className="font-medium">
						{day.label}
					</Text>
				</div>
			))}
		</div>
	)
}
