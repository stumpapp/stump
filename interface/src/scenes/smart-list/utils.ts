import { SmartListMeta } from '@stump/types'

import pluralizeStat from '@/utils/pluralize'

export function parseListMeta({ matched_books, matched_series, matched_libraries }: SmartListMeta) {
	const matchedBooks = Number(matched_books)
	const matchedSeries = Number(matched_series)
	const matchedLibraries = Number(matched_libraries)

	const figures = [
		{ label: 'book', value: matchedBooks },
		{ label: 'series', value: matchedSeries },
		{ label: 'library', value: matchedLibraries },
	].filter(({ value }) => !isNaN(value))

	if (figures.length === 0) {
		return null
	}

	const figureString = figures.map(({ label, value }) => pluralizeStat(label, value)).join(' • ')

	return {
		figureString,
		figures,
	}
}
