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
