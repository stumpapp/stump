import { useEffect, useRef } from 'react'

/**
 * Returns the previous value of a variable.
 */
export function usePrevious<T>(value: T) {
	const ref = useRef<T>(undefined as unknown as T)
	useEffect(() => {
		ref.current = value
	})
	// eslint-disable-next-line react-hooks/refs
	return ref.current
}
