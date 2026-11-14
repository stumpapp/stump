import { addDays, format, isAfter, parse, startOfMonth, startOfWeek, startOfYear } from 'date-fns'

// Note: these mirror the helpers in the expo app's reading stats (apps/expo/components/readingStats)

export type StatsRangePreset = 'week' | 'month' | 'year' | 'lifetime'

export const STATS_RANGE_PRESETS: StatsRangePreset[] = ['week', 'month', 'year', 'lifetime']

export type DateRange = {
	start?: string
	end?: string
}

/**
 * @returns the input for a ranged query provided the preset
 */
export function toDateRange(preset: StatsRangePreset, now = new Date()): DateRange {
	switch (preset) {
		case 'week':
			return { start: format(startOfWeek(now), 'yyyy-MM-dd') }
		case 'month':
			return { start: format(startOfMonth(now), 'yyyy-MM-dd') }
		case 'year':
			return { start: format(startOfYear(now), 'yyyy-MM-dd') }
		case 'lifetime':
			return {}
	}
}

export type ActivityDay = {
	date: string
	seconds: number
}

/**
 * Build one entry per day from `start` to `end` (inclusive), filling in days
 * without any activity with 0 seconds
 */
export function buildDays(
	start: string,
	end: string,
	secondsByDate: Map<string, number>,
): ActivityDay[] {
	const days: ActivityDay[] = []
	const today = new Date()
	const endDate = parse(end, 'yyyy-MM-dd', today)

	for (
		let cursor = parse(start, 'yyyy-MM-dd', today);
		!isAfter(cursor, endDate);
		cursor = addDays(cursor, 1)
	) {
		const date = format(cursor, 'yyyy-MM-dd')
		days.push({ date, seconds: secondsByDate.get(date) ?? 0 })
	}

	return days
}

/**
 * The intensity level (0-4) of a day's activity relative to the most active day
 */
export function toLevel(seconds: number, max: number) {
	if (seconds <= 0 || max <= 0) return 0
	return Math.min(4, Math.ceil((seconds / max) * 4))
}
