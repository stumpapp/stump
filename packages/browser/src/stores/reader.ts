import { createReaderStore } from '@stump/client'
import { useCallback, useEffect, useRef, useState } from 'react'

export const useReaderStore = createReaderStore(localStorage)

type UseBookTimerParams = {
	initial?: number | null
	enabled?: boolean
}

const defaultParams: UseBookTimerParams = {
	initial: 0,
	enabled: true,
}

export const useBookTimer = (id: string, params: UseBookTimerParams = defaultParams) => {
	const [initial, setInitial] = useState(params.initial)
	const startDateRef = useRef<number | null>(null)

	const getCurrentTime = useCallback(() => {
		const bookTimer = useReaderStore.getState().bookTimers[id] || 0
		const resolvedTimer = !!initial && initial > bookTimer ? initial : bookTimer

		if (startDateRef.current === null) {
			return resolvedTimer
		}

		const elapsed = Math.trunc((Date.now() - startDateRef.current) / 1000)
		return resolvedTimer + elapsed
	}, [id, initial])

	const pause = useCallback(() => {
		if (startDateRef.current === null) return

		const elapsedSeconds = getCurrentTime()
		useReaderStore.getState().setBookTimer(id, elapsedSeconds)

		startDateRef.current = null
	}, [id, getCurrentTime])

	const resume = useCallback(() => {
		if (!params.enabled || startDateRef.current !== null) return
		startDateRef.current = Date.now()
	}, [params.enabled])

	const reset = useCallback(() => {
		setInitial(0)
		useReaderStore.getState().setBookTimer(id, 0)
		startDateRef.current = startDateRef.current !== null ? Date.now() : null
	}, [id])

	useEffect(() => {
		if (!params.enabled) {
			pause()
		} else {
			resume()
		}
	}, [params.enabled, pause, resume])

	return { getCurrentTime, pause, resume, reset }
}

export type Timer = ReturnType<typeof useBookTimer>
