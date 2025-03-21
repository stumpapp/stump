import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

type Params = {
	onStateChanged?: (activating: boolean) => void
}

/**
 * Hook that returns app state, and takes a callback that is called on active state changes
 *
 * @param callback If defined, it will be called with the "activating" parameter = true when entering active state,
 * false when leaving active state
 *
 * @returns one of 'active', 'background', 'inactive', or 'unknown'
 */
export const useAppState = ({ onStateChanged }: Params) => {
	const callbackRef = useRef<typeof onStateChanged>()
	useEffect(() => {
		callbackRef.current = onStateChanged
	}, [onStateChanged])

	const appState = useRef(AppState.currentState)

	useEffect(() => {
		const cb = (activating: boolean) => callbackRef.current && callbackRef.current(activating)

		const subscription = AppState.addEventListener('change', (nextAppState) => {
			// Foregrounding
			if (appState.current !== 'active' && nextAppState === 'active') {
				cb?.(true)
			}
			// Backgrounding
			if (appState.current === 'active' && nextAppState !== 'active') {
				cb?.(false)
			}
			appState.current = nextAppState
		})

		return () => {
			subscription.remove()
		}
	}, [onStateChanged])

	return appState.current
}
