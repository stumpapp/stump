import { ReactTableGlobalSort } from '@stump/sdk'

import { Ordering } from './context'

export const EXCLUDED_FILTER_KEYS = ['order_by', 'direction', 'page', 'page_size']
export const EXCLUDED_FILTER_KEYS_FOR_COUNTS = EXCLUDED_FILTER_KEYS.concat(['search'])

export const getActiveFilterCount = (filters: Record<string, unknown>) => {
	return Object.keys(filters).filter((key) => !EXCLUDED_FILTER_KEYS_FOR_COUNTS.includes(key)).length
}

export const clearFilters = (filters: Record<string, unknown>): Record<string, unknown> =>
	Object.keys(filters).reduce(
		(acc, key) => {
			if (EXCLUDED_FILTER_KEYS.includes(key)) {
				acc[key] = filters[key]
			}
			return acc
		},
		{} as Record<string, unknown>,
	)

/**
 * Converts the react-table sort object to an ordering object.
 *
 * Note that only the **first** sort is considered.
 */
export const tableSortToOrdering = (sort: ReactTableGlobalSort[]): Ordering => {
	if (sort[0]) {
		return {
			direction: sort[0].desc ? 'desc' : 'asc',
			order_by: sort[0].id,
		}
	} else {
		return {}
	}
}

/**
 * Converts the ordering object to a react-table sort object.
 */
export const orderingToTableSort = (ordering: Ordering): ReactTableGlobalSort[] => {
	if (ordering.order_by) {
		return [
			{
				desc: ordering.direction === 'desc',
				id: ordering.order_by,
			},
		]
	} else {
		return []
	}
}
