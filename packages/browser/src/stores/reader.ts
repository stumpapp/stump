import { createReaderStore } from '@stump/client'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStopwatch } from 'react-timer-hook'

export const useReaderStore = createReaderStore(localStorage)

type UseBookTimerParams = {
	initial?: number | null
	enabled?: boolean
}

export const useBookReadTime = (
	id: string,
	{ initial }: Omit<UseBookTimerParams, 'enabled'> = {},
) => {
	const bookTimers = useReaderStore((state) => state.bookTimers)
	const bookTimer = useMemo(() => bookTimers[id] || 0, [bookTimers, id])
	return bookTimer || initial || 0
}

const defaultParams: UseBookTimerParams = {
	initial: 0,
	enabled: true,
}

export const useBookTimer = (id: string, params: UseBookTimerParams = defaultParams) => {
	const [initial] = useState(() => params.initial)

	const bookTimers = useReaderStore((state) => state.bookTimers)
	const bookTimer = useMemo(() => bookTimers[id] || 0, [bookTimers, id])
	const setBookTimer = useReaderStore((state) => state.setBookTimer)

	const resolvedTimer = useMemo(
		() => (!!initial && initial > bookTimer ? initial : bookTimer),
		[initial, bookTimer],
	)

	const { pause, totalSeconds, reset, isRunning } = useStopwatch({
		autoStart: !!id && !!params.enabled,
		offsetTimestamp: dayjs()
			.add(resolvedTimer || 0, 'seconds')
			.toDate(),
	})

	const pauseTimer = useCallback(() => {
		if (isRunning) {
			pause()
			setBookTimer(id, totalSeconds)
		}
	}, [id, pause, setBookTimer, totalSeconds, isRunning])

	const resumeTimer = useCallback(() => {
		if (!params.enabled) return

		if (!isRunning) {
			const offset = dayjs().add(totalSeconds, 'seconds').toDate()
			reset(offset)
		}
	}, [totalSeconds, reset, isRunning, params.enabled])

	const resetTimer = useCallback(() => {
		reset(undefined, params.enabled)
		setBookTimer(id, 0)
	}, [reset, params.enabled, id, setBookTimer])

	useEffect(() => {
		reset(
			dayjs()
				.add(resolvedTimer || 0, 'seconds')
				.toDate(),
		)
	}, [resolvedTimer, reset])

	useEffect(() => {
		if (!params.enabled) {
			pause()
			setBookTimer(id, totalSeconds)
		}
	}, [params.enabled, isRunning, pause, setBookTimer, id, totalSeconds])

	return { totalSeconds, pause: pauseTimer, resume: resumeTimer, reset: resetTimer, isRunning }
}
