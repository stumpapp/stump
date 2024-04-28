import { usePrevious } from './usePrevious'

type Params = {
	/**
	 * If true, there is no initial check for nullish values.
	 */
	ignoreNullish?: boolean
}
/**
 * Returns true if the previous value is different from the current value. If
 * `ignoreNullish` is true, then nullish values are 'ignored'.
 */
export function usePreviousIsDifferent<T>(value: T, { ignoreNullish = false }: Params = {}) {
	const previous = usePrevious(value)
	return ignoreNullish ? value !== previous : value != null && value !== previous
}
