import { SmartListMeta } from '@stump/graphql'

import pluralizeStat from '@/utils/pluralize'

export function parseListMeta({ matchedBooks, matchedSeries, matchedLibraries }: SmartListMeta) {
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
