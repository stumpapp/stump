import { useCallback, useEffect, useRef } from 'react'

import { usePreferencesStore } from '~/stores'

import { useAppState } from './useAppState'

type Params = {
	databaseSeconds: number | null | undefined
	enabled?: boolean
}

export const useReadingTimer = ({ databaseSeconds, enabled = false }: Params) => {
	const maxPageViewingSeconds = usePreferencesStore((state) => state.maxPageViewingSeconds)

	const baseSecondsRef = useRef<number>(0)
	const hasInitializedRef = useRef<boolean>(false)

	const isRunningRef = useRef<boolean>(false)

	// per page viewing
	const pageStartRef = useRef<number | null>(null)
	const pageMsRef = useRef<number>(0)

	const resume = useCallback(() => {
		if (!enabled) return
		if (isRunningRef.current) return

		pageStartRef.current = performance.now()
		isRunningRef.current = true
	}, [enabled])

	const pause = useCallback(() => {
		if (!isRunningRef.current) return

		if (pageStartRef.current !== null) {
			pageMsRef.current += performance.now() - pageStartRef.current
			isRunningRef.current = false
		}
	}, [])

	const computePendingTime = useCallback(() => {
		let pageMs = pageMsRef.current

		if (isRunningRef.current && pageStartRef.current !== null) {
			pageMs += performance.now() - pageStartRef.current
		}

		const pageSeconds = Math.floor(pageMs / 1000)
		const cappedSeconds = Math.min(pageSeconds, maxPageViewingSeconds)
		const remainderMs = cappedSeconds !== maxPageViewingSeconds ? pageMs - pageSeconds * 1000 : 0

		return { cappedSeconds, remainderMs }
	}, [maxPageViewingSeconds])

	const popDeltaSeconds = useCallback(() => {
		const { cappedSeconds, remainderMs } = computePendingTime()

		pageMsRef.current = remainderMs
		pageStartRef.current = isRunningRef.current ? performance.now() : null
		baseSecondsRef.current += cappedSeconds

		return cappedSeconds
	}, [computePendingTime])

	const getTotalSeconds = useCallback(() => {
		const { cappedSeconds } = computePendingTime()

		return baseSecondsRef.current + cappedSeconds
	}, [computePendingTime])

	const clearTotalSeconds = useCallback(() => {
		pageMsRef.current = 0
		pageStartRef.current = isRunningRef.current ? performance.now() : null
		baseSecondsRef.current = 0
	}, [])

	useEffect(() => {
		if (!enabled) return
		if (databaseSeconds == undefined) return

		if (!hasInitializedRef.current) {
			baseSecondsRef.current = databaseSeconds
			hasInitializedRef.current = true
		}
		// If the databaseSeconds are higher than our localSeconds, sync it up
		// only happens if in a short period you read on one device, swap to another, then swap back
		else {
			const { cappedSeconds } = computePendingTime()
			const localSeconds = baseSecondsRef.current + cappedSeconds

			if (databaseSeconds > localSeconds) {
				const difference = databaseSeconds - localSeconds
				baseSecondsRef.current += difference
			}
		}
	}, [databaseSeconds, enabled, computePendingTime])

	useEffect(() => {
		if (!enabled) {
			pause()
		} else if (hasInitializedRef.current) {
			resume()
		}
	}, [enabled, pause, resume])

	const handleFocusedChanged = useCallback(
		(focused: boolean) => {
			if (!focused) {
				pause()
			} else if (hasInitializedRef.current) {
				resume()
			}
		},
		[pause, resume],
	)

	useAppState({ onStateChanged: handleFocusedChanged })

	return { resume, pause, popDeltaSeconds, getTotalSeconds, clearTotalSeconds, isRunningRef }
}

export type Timer = ReturnType<typeof useReadingTimer>
