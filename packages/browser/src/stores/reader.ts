import { createReaderStore } from '@stump/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
	const [initial, setInitial] = useState(() => params.initial)

	const bookTimers = useReaderStore((state) => state.bookTimers)
	const bookTimer = useMemo(() => bookTimers[id] || 0, [bookTimers, id])
	const setBookTimer = useReaderStore((state) => state.setBookTimer)

	const resolvedTimer = useMemo(
		() => (!!initial && initial > bookTimer ? initial : bookTimer),
		[initial, bookTimer],
	)

	const startDateRef = useRef<number | null>(null)

	const getCurrentTime = useCallback(() => {
		let elapsed = 0
		if (startDateRef.current !== null) {
			elapsed = Math.trunc((Date.now() - startDateRef.current) / 1000)
		}
		return resolvedTimer + elapsed
	}, [resolvedTimer])

	const pause = useCallback(() => {
		if (startDateRef.current === null) return

		const elapsedSeconds = getCurrentTime()
		setBookTimer(id, elapsedSeconds)

		startDateRef.current = null
	}, [id, setBookTimer, getCurrentTime])

	const resume = useCallback(() => {
		if (!params.enabled || startDateRef.current !== null) return
		startDateRef.current = Date.now()
	}, [params.enabled])

	const reset = useCallback(() => {
		setInitial(0)
		setBookTimer(id, 0)
		startDateRef.current = startDateRef.current !== null ? Date.now() : null
	}, [id, setBookTimer])

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
