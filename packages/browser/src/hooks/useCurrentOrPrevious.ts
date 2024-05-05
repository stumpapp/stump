import { useEffect, useRef } from 'react'

type Params = {
	method?: 'falsy' | 'defined'
}

export function useCurrentOrPrevious<T>(
	value: T | undefined,
	{ method } = defaultParams,
): T | undefined {
	const previousValue = useRef<T | undefined>(undefined)

	useEffect(() => {
		if (value !== undefined) {
			previousValue.current = value
		}
	}, [value])

	if (method === 'falsy') {
		return value || previousValue.current
	} else {
		return value ?? previousValue.current
	}
}

const defaultParams: Params = {
	method: 'falsy',
}
