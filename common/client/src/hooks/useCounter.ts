import { useMemo, useState } from 'react';

export function useCounter(initialValue: number = 0) {
	const [count, setCount] = useState(initialValue);

	const actions = useMemo(
		() => ({
			increment: () => setCount(count + 1),
			decrement: () => setCount(count - 1),
			reset: () => setCount(initialValue),
			set: (value: number) => setCount(value),
		}),
		[count],
	);

	return [count, actions] as const;
}
