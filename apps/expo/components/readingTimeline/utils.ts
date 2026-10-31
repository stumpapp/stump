import { intlFormat, isSameMinute } from 'date-fns'

type DateParam = {
	date: Date
	opts?: Intl.DateTimeFormatOptions
}

/**
 * Formats a time range between two dates:
 *
 * - if elapsedSeconds is <= 0 or if there is effectively no difference in the
 *   start/end (within the same minute) then we only show start
 * - otherwise we show the full range
 *
 * This is because you can have "instance" sessions, e.g., I mark a book as
 * completed or sync progress through something like KOReader/Kobo
 */
export function formatTimeRange(
	start: DateParam,
	end: DateParam,
	elapsedSeconds: number,
	translate: (key: string, params?: Record<string, unknown>) => string,
): string {
	const isInstanceUpdate = isSameMinute(end.date, start.date)
	// ^ params feel unintuitively ordered but named as later vs earlier date
	// also doesn't matter prob

	// okay so it's an awkward dance because:
	// - any kind of sync that isn't Stump offline-to-online will not have
	//   seconds
	// - it should be possible to resync to get non-instance stamps
	// - it is valid to show non-instance stamps even when secs = 0
	const formatAsRange = !isInstanceUpdate || elapsedSeconds > 0

	if (formatAsRange) {
		return translate('shared.common.time.dateRange', {
			startDate: intlFormat(start.date, {
				hour: 'numeric',
				minute: 'numeric',
				...start.opts,
			}),
			endDate: intlFormat(end.date, {
				hour: 'numeric',
				minute: 'numeric',
				...end.opts,
			}),
		})
	} else {
		return intlFormat(start.date, {
			hour: 'numeric',
			minute: 'numeric',
			...start.opts,
		})
	}
}
