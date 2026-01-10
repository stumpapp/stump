import { SmartListMeta } from '@stump/graphql'
import isEqual from 'lodash/isEqual'

import pluralizeStat from '@/utils/pluralize'

import { WorkingView } from './context'

/**
 * Compares two views to check if they are equivalent (ignoring undefined vs empty array differences)
 */
export function viewsAreEqual(
	a: WorkingView | Record<string, unknown> | undefined,
	b: WorkingView | Record<string, unknown> | undefined,
): boolean {
	if (a === b) return true
	if (!a || !b) return false

	// Note: The primary thing normalizing here is I want to treat undefined arrays as empty arrays for comparison
	// since they would be functionally equivalent in the table
	const normalize = (view: Record<string, unknown>) => ({
		bookColumns: view.bookColumns ?? [],
		bookSorting: view.bookSorting ?? [],
		groupColumns: view.groupColumns ?? [],
		groupSorting: view.groupSorting ?? [],
		search: view.search ?? undefined,
		enableMultiSort: view.enableMultiSort ?? undefined,
	})

	return isEqual(normalize(a), normalize(b))
}

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
