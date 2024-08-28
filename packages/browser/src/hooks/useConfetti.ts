import { useCallback } from 'react'

import { useAppStore } from '@/stores'

type Params = {
	duration?: number
}
export function useConfetti({ duration = 3000 }: Params = {}) {
	const setShowConfetti = useAppStore((store) => store.setShowConfetti)

	const stop = useCallback(() => {
		setShowConfetti(false)
	}, [setShowConfetti])

	const start = useCallback(() => {
		setShowConfetti(true)
		setTimeout(stop, duration)
	}, [setShowConfetti, stop, duration])

	return { start, stop }
}
