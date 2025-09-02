import { useCallback, useRef, useState } from 'react'

type Params = {
	intervalMs?: number
}

/**
 * A hook to support press and hold events, e.g. for buttons
 */
export function usePressAndHold({ intervalMs = 100 }: Params = {}) {
	const intervalRef = useRef<NodeJS.Timeout | null>(null)
	const [isHolding, setIsHolding] = useState(false)

	/**
	 * Stop the press and hold event. This will clear the interval.
	 */
	const stop = useCallback(() => {
		if (intervalRef.current) {
			clearTimeout(intervalRef.current)
			intervalRef.current = null
		}
		setIsHolding(false)
		window.removeEventListener('pointerup', stop)
		window.removeEventListener('pointercancel', stop)
	}, [])

	/**
	 * Start the press and hold event, using the given callback. The callback will be
	 * called every `intervalMs` milliseconds.
	 */
	const start = useCallback(
		(callback: () => void) => {
			if (intervalRef.current) return

			setIsHolding(true)
			callback()
			intervalRef.current = setInterval(callback, intervalMs)
			window.addEventListener('pointerup', stop)
			window.addEventListener('pointercancel', stop)
		},
		[intervalMs, stop],
	)

	/**
	 * A utility function that returns the necessary props for creating a press and hold
	 * event on a button. The general idea is:
	 *
	 * 1. When the mouse is pressed down, start the press and hold event
	 * 2. Even if the mouse moves off the button, it will still be held
	 * 3. When the mouse is released, stop the press and hold event
	 */
	const bindButton = useCallback(
		({ callback }: { callback: () => void }) => ({
			onPointerDown: () => start(callback),
		}),
		[start],
	)

	return { bindButton, isHolding, start, stop }
}
