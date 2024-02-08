/**
 * A crude function that removes empty values from an object. Should probably be tested
 * or sm idk
 */
export const removeEmpty = (obj: Record<string, unknown>) => {
	return Object.entries(obj).reduce(
		(acc, [key, value]) => {
			if (typeof value === 'object' && value != null) {
				acc[key] = removeEmpty(value as Record<string, unknown>)
			} else if (value != null && value !== '') {
				acc[key] = value
			}
			return acc
		},
		{} as Record<string, unknown>,
	)
}
