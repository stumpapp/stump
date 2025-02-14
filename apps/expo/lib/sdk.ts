import type { Media } from '@stump/sdk'

export const getBookProgression = ({
	active_reading_session,
	finished_reading_sessions,
	pages,
}: Media) => {
	if (!active_reading_session && !finished_reading_sessions) {
		return null
	} else if (active_reading_session) {
		const { epubcfi, percentage_completed, page } = active_reading_session

		if (epubcfi && percentage_completed) {
			return Math.round(percentage_completed * 100)
		} else if (page) {
			const percent = Math.round((page / pages) * 100)
			return Math.min(Math.max(percent, 0), 100) // Clamp between 0 and 100
		}
	} else if (finished_reading_sessions?.length) {
		return 100
	}

	return null
}
