import AsyncStorage from '@react-native-async-storage/async-storage'
import { BookPreferences } from '@stump/client'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStopwatch } from 'react-timer-hook'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type GlobalSettings = BookPreferences & { incognito?: boolean }

type ElapsedSeconds = number

export type ReaderStore = {
	isReading: boolean
	setIsReading: (reading: boolean) => void

	globalSettings: GlobalSettings
	setGlobalSettings: (settings: Partial<GlobalSettings>) => void

	bookSettings: Record<string, BookPreferences>
	addBookSettings: (id: string, preferences: BookPreferences) => void
	setBookSettings: (id: string, preferences: Partial<BookPreferences>) => void

	bookTimers: Record<string, ElapsedSeconds>
	setBookTimer: (id: string, timer: ElapsedSeconds) => void

	showControls: boolean
	setShowControls: (show: boolean) => void
}

export const useReaderStore = create<ReaderStore>()(
	persist(
		(set, get) =>
			({
				isReading: false,
				setIsReading: (reading) => set({ isReading: reading }),
				globalSettings: {
					brightness: 1,
					readingDirection: 'ltr',
					imageScaling: {
						scaleToFit: 'width',
					},
					readingMode: 'paged',
				} satisfies BookPreferences,
				setGlobalSettings: (updates: Partial<GlobalSettings>) =>
					set({ globalSettings: { ...get().globalSettings, ...updates } }),

				bookSettings: {},
				addBookSettings: (id, preferences) =>
					set({ bookSettings: { ...get().bookSettings, [id]: preferences } }),
				setBookSettings: (id, updates) =>
					set({
						bookSettings: {
							...get().bookSettings,
							[id]: { ...get().bookSettings[id], ...updates },
						},
					}),

				bookTimers: {},
				setBookTimer: (id, elapsedSeconds) =>
					set({ bookTimers: { ...get().bookTimers, [id]: elapsedSeconds } }),

				showControls: false,
				setShowControls: (show) => set({ showControls: show }),
			}) as ReaderStore,
		{
			name: 'stump-reader-store',
			storage: createJSONStorage(() => AsyncStorage),
			version: 1,
		},
	),
)

export const useBookPreferences = (id: string) => {
	const store = useReaderStore((state) => state)

	const bookSettings = useMemo(() => store.bookSettings[id], [store.bookSettings, id])

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!bookSettings) {
				store.addBookSettings(id, {
					...store.globalSettings,
					...updates,
				})
			} else {
				store.setBookSettings(id, updates)
			}
		},
		[id, bookSettings, store],
	)

	return {
		preferences: {
			...(bookSettings || store.globalSettings),
			incognito: store.globalSettings.incognito,
		},
		setBookPreferences,
		updateGlobalSettings: store.setGlobalSettings,
	}
}

type UseBookTimerParams = {
	initial?: number | null
}

export const useBookReadTime = (id: string, { initial }: UseBookTimerParams = {}) => {
	const bookTimers = useReaderStore((state) => state.bookTimers)
	const bookTimer = useMemo(() => bookTimers[id] || 0, [bookTimers, id])
	return bookTimer || initial || 0
}

export const useBookTimer = (id: string, params: UseBookTimerParams = {}) => {
	const [initial] = useState(() => params.initial)

	const bookTimers = useReaderStore((state) => state.bookTimers)
	const bookTimer = useMemo(() => bookTimers[id] || 0, [bookTimers, id])
	const setBookTimer = useReaderStore((state) => state.setBookTimer)

	const resolvedTimer = useMemo(
		() => (!!initial && initial > bookTimer ? initial : bookTimer),
		[initial, bookTimer],
	)

	const { pause, totalSeconds, reset, isRunning } = useStopwatch({
		autoStart: !!id,
		offsetTimestamp: dayjs()
			.add(resolvedTimer || 0, 'seconds')
			.toDate(),
	})

	const pauseTimer = useCallback(() => {
		pause()
		setBookTimer(id, totalSeconds)
	}, [id, pause, setBookTimer, totalSeconds])

	const resumeTimer = useCallback(() => {
		const offset = dayjs().add(totalSeconds, 'seconds').toDate()
		reset(offset)
	}, [totalSeconds, reset])

	useEffect(() => {
		reset(
			dayjs()
				.add(resolvedTimer || 0, 'seconds')
				.toDate(),
		)
	}, [resolvedTimer, reset])

	return { totalSeconds, pause: pauseTimer, resume: resumeTimer, isRunning }
}

export const useHideStatusBar = () => {
	const { isReading, showControls } = useReaderStore((state) => ({
		isReading: state.isReading,
		showControls: state.showControls,
	}))

	return isReading && !showControls
}
