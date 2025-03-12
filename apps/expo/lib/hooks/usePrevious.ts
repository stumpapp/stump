import { useEffect, useRef } from 'react'

/**
 * Returns the previous value of a variable.
 */
export function usePrevious<T>(value: T) {
	const ref = useRef<T>()
	useEffect(() => {
		ref.current = value
	})
	return ref.current
}
