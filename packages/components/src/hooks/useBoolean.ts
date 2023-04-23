import { useMemo, useState } from 'react'

export function useBoolean(initialState?: boolean) {
	const [state, setState] = useState(initialState || false)

	const actions = useMemo(
		() => ({
			off: () => setState(false),
			on: () => setState(true),
			toggle: () => setState((s) => !s),
		}),
		[],
	)

	return [state, actions] as const
}
