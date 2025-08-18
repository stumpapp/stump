import { BookPreferences as IBookPreferences } from '@stump/client'
import { ReadingDirection, ReadingImageScaleFit, ReadingMode } from '@stump/graphql'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStopwatch } from 'react-timer-hook'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useActiveServer } from '~/components/activeServer'
import { ImageBasedBookRef } from '~/components/book/reader/image'

import { ZustandMMKVStorage } from './store'

export type DoublePageBehavior = 'auto' | 'always' | 'off'

export type FooterControls = 'images' | 'slider'

export type CachePolicy = 'none' | 'disk' | 'memory' | 'memory-disk'
export const isCachePolicy = (value: string): value is CachePolicy =>
	['none', 'disk', 'memory', 'memory-disk'].includes(value)

export type BookPreferences = IBookPreferences & {
	serverID?: string
	incognito?: boolean
	preferSmallImages?: boolean
	allowDownscaling: boolean
	cachePolicy: CachePolicy
	doublePageBehavior: DoublePageBehavior
	tapSidesToNavigate: boolean
	footerControls: FooterControls
	trackElapsedTime: boolean
}
export type GlobalSettings = Omit<BookPreferences, 'serverID'>

type ElapsedSeconds = number

type BookCacheData = {
	dimensions: Record<number, { width: number; height: number; ratio: number }>
}

export type ReaderStore = {
	isReading: boolean
	setIsReading: (reading: boolean) => void

	globalSettings: GlobalSettings
	setGlobalSettings: (settings: Partial<GlobalSettings>) => void

	bookSettings: Record<string, BookPreferences>
	addBookSettings: (id: string, preferences: BookPreferences) => void
	setBookSettings: (id: string, preferences: Partial<BookPreferences>) => void
	clearLibrarySettings: (serverID: string) => void

	/**
	 * A cache of miscellaneous book data Stump uses
	 */
	bookCache: Record<string, BookCacheData>
	setBookCache: (id: string, data: BookCacheData) => void

	bookTimers: Record<string, ElapsedSeconds>
	setBookTimer: (id: string, timer: ElapsedSeconds) => void

	showControls: boolean
	setShowControls: (show: boolean) => void
}

export const DEFAULT_BOOK_PREFERENCES = {
	fontSize: 13,
	lineHeight: 1.5,
	brightness: 1,
	readingMode: ReadingMode.Paged,
	readingDirection: ReadingDirection.Ltr,
	imageScaling: {
		scaleToFit: ReadingImageScaleFit.Height,
	},
	doublePageBehavior: 'off',
	secondPageSeparate: false,
	trackElapsedTime: true,
	tapSidesToNavigate: true,
	allowDownscaling: false,
	cachePolicy: 'memory-disk',
	footerControls: 'images',
} satisfies GlobalSettings

export const useReaderStore = create<ReaderStore>()(
	persist(
		(set, get) =>
			({
				isReading: false,
				setIsReading: (reading) => set({ isReading: reading }),
				globalSettings: DEFAULT_BOOK_PREFERENCES,
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
				bookCache: {},
				setBookCache: (id, data) => {
					set({
						bookCache: {
							...get().bookCache,
							[id]: data,
						},
					})
				},
				clearLibrarySettings: (serverID) =>
					set({
						bookSettings: Object.fromEntries(
							Object.entries(get().bookSettings).filter(
								([, settings]) => settings.serverID !== serverID,
							),
						),
					}),
				bookTimers: {},
				setBookTimer: (id, elapsedSeconds) =>
					set({ bookTimers: { ...get().bookTimers, [id]: elapsedSeconds } }),

				showControls: false,
				setShowControls: (show) => set({ showControls: show }),
			}) as ReaderStore,
		{
			name: 'stump-reader-store',
			storage: createJSONStorage(() => ZustandMMKVStorage),
			version: 1,
		},
	),
)

type Params = {
	book: ImageBasedBookRef
}

export const useBookPreferences = ({ book }: Params) => {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const store = useReaderStore((state) => state)

	const bookSettings = useMemo(() => store.bookSettings[book.id], [store.bookSettings, book.id])

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!bookSettings) {
				store.addBookSettings(book.id, {
					...store.globalSettings,
					...updates,
					serverID,
				})
			} else {
				store.setBookSettings(book.id, { ...updates, serverID })
			}
		},
		[book.id, bookSettings, store, serverID],
	)

	return {
		globalSettings: store.globalSettings,
		preferences: {
			...store.globalSettings,
			...(bookSettings || store.globalSettings),
		},
		setBookPreferences,
		updateGlobalSettings: store.setGlobalSettings,
	}
}

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

export const useHideStatusBar = () => {
	const { isReading } = useReaderStore((state) => ({
		isReading: state.isReading,
	}))

	return isReading
}
