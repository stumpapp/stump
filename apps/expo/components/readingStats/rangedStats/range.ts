import { format, startOfMonth, startOfWeek, startOfYear } from 'date-fns'

export type StatsRangePreset = 'week' | 'month' | 'year' | 'lifetime'

export const STATS_RANGE_PRESETS: StatsRangePreset[] = ['week', 'month', 'year', 'lifetime']

export type DateRange = {
	start?: string
	end?: string
}

/**
 * @returns the input for a ranged query provided the preset
 */
export function toDateRange(preset: StatsRangePreset): DateRange {
	const now = new Date()
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
