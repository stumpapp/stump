import { useCallback, useRef } from 'react'

import { useAppStore } from '@/stores'

type Params = {
	/**
	 * The duration in milliseconds to show the confetti animation
	 */
	duration?: number
}

/**
 * A hook to start and stop the confetti animation
 */
export function useConfetti({ duration = 3000 }: Params = {}) {
	const setShowConfetti = useAppStore((store) => store.setShowConfetti)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	/**
	 * Stop the confetti animation and clear the timeout)
	 */
	const stop = useCallback(() => {
		setShowConfetti(false)
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}
	}, [setShowConfetti])

	/**
	 * Start the confetti animation and set a timeout to stop it after the provided
	 * duration
	 */
	const start = useCallback(() => {
		setShowConfetti(true)
		timeoutRef.current = setTimeout(stop, duration)
	}, [setShowConfetti, stop, duration])

	return { start, stop }
}
