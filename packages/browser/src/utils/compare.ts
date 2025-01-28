import isMatch from 'lodash/isMatch'
import pick from 'lodash/pick'

/**
 * A utility function to compare two objects by a set of keys. This will return true if
 * each key in the set of keys is equal between the two objects.
 * Note: The first object will define the keys which are comparable
 */
export const compareByKeys = <T extends Record<string, unknown>, K extends keyof T>(
	a: T,
	b: Record<string, unknown>,
	keys: K[],
): boolean => {
	const aPicked = pick(a, keys)
	const bPicked = pick(b, keys)

	return isMatch(aPicked, bPicked)
}
