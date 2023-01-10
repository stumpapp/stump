import { useMemo, useState } from 'react'

export function useCounter(initialValue = 0) {
	const [count, setCount] = useState(initialValue)

	const actions = useMemo(
		() => ({
			decrement: () => setCount(count - 1),
			increment: () => setCount(count + 1),
			reset: () => setCount(initialValue),
			set: (value: number) => setCount(value),
		}),
		[initialValue, count],
	)

	return [count, actions] as const
}
