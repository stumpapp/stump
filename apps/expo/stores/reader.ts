import { BookPreferences as IBookPreferences } from '@stump/client'
import { ReadingDirection, ReadingImageScaleFit, ReadingMode } from '@stump/graphql'
import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { useActiveServerSafe } from '~/components/activeServer'
import { ImageReaderBookRef } from '~/components/book/reader/image/context'
import { ColumnCount, ImageFilter, TextAlignment } from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

export type DoublePageBehavior = 'auto' | 'always' | 'off'

export type FooterControls = 'images' | 'slider'

export type BookPreferences = IBookPreferences & {
	serverID?: string
	incognito?: boolean
	preferSmallImages?: boolean
	allowDownscaling: boolean
	doublePageBehavior: DoublePageBehavior
	tapSidesToNavigate: boolean
	volumeButtonsNavigate: boolean
	footerControls: FooterControls
	trackElapsedTime: boolean
	// Everything below here is epub-specific
	allowPublisherStyles?: boolean
	pageMargins?: number
	columnCount?: ColumnCount
	imageFilter?: ImageFilter
	verticalText?: boolean
	textAlign?: TextAlignment
	typeScale?: number
	fontWeight?: number
	paragraphIndent?: number
	paragraphSpacing?: number
	wordSpacing?: number
	letterSpacing?: number
	hyphens?: boolean
	ligatures?: boolean
	textNormalization?: boolean
}
export type GlobalSettings = Omit<BookPreferences, 'serverID'>

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

	bookOverrides: Record<string, boolean>
	setBookOverride: (id: string, override: boolean) => void

	showControls: boolean
	setShowControls: (show: boolean) => void
}

export const DEFAULT_BOOK_PREFERENCES = {
	fontSize: 13,
	lineHeight: 1.5,
	// brightness will be unused unless for android we change to getBrightnessAsync() to separate system vs book brightness
	brightness: 1,
	readingMode: ReadingMode.Paged,
	readingDirection: ReadingDirection.Ltr,
	imageScaling: {
		scaleToFit: ReadingImageScaleFit.Auto,
	},
	doublePageBehavior: 'auto',
	secondPageSeparate: false,
	trackElapsedTime: true,
	tapSidesToNavigate: true,
	volumeButtonsNavigate: false,
	allowDownscaling: false,
	footerControls: 'images',
	allowPublisherStyles: true,
	pageMargins: 1.0,
	columnCount: 'auto',
	textAlign: 'justify',
	typeScale: 1.0,
} satisfies GlobalSettings

export const useReaderStore = create<ReaderStore>()(
	persist(
		(set, get) =>
			({
				isReading: false,
				setIsReading: (reading) => set({ isReading: reading }),
				globalSettings: DEFAULT_BOOK_PREFERENCES,
				setGlobalSettings: (updates: Partial<GlobalSettings>) => {
					// NOTE: i added this timeout to fix a weird crash that happens in very specific circumstances
					// when updating globalSettings from within a native callback (e.g. zeego + truesheet).
					// i honestly don't fully understand why this fixed it, it was a shot in the dark to try
					// and see if defering the update until after interactions would help, and once added i did
					// not observe the error. the crash was reported in testflight, so no issue to link to, but
					// i confirmed it on both platforms. super weird:
					// - go into paged reader for book where you have not messed with settings (will not work otherwise)
					// - open action menu and if:
					//   1. clicking shortcut to toggle direction, works FINE
					//   2. click into settings -> change direction -> crash with red herring nativation context error
					// - go back into book, change settings -> it's fine
					// - go into new book (new non-messed with book), go into settings first, change settings -> crash
					// an onlooker is probably thinking "well why not timeout more colocated to the actual update in reader settigns?"
					// i did, and for whatever reason (even though logically identical) it did not work. so, unforunately, the timeout
					// is here for now
					setTimeout(() => set({ globalSettings: { ...get().globalSettings, ...updates } }))
				},

				bookSettings: {},
				addBookSettings: (id, preferences) =>
					set({ bookSettings: { ...get().bookSettings, [id]: preferences } }),
				setBookSettings: (id, updates) => {
					const bookPreferences = get().bookSettings?.[id]
					set({
						bookSettings: {
							...get().bookSettings,
							...(bookPreferences ? { [id]: { ...bookPreferences, ...updates } } : {}),
						},
					})
				},

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

				bookOverrides: {},
				setBookOverride: (id, override) =>
					set({ bookOverrides: { ...get().bookOverrides, [id]: override } }),

				showControls: false,
				setShowControls: (show) => set({ showControls: show }),
			}) as ReaderStore,
		{
			name: 'stump-reader-store',
			storage: createJSONStorage(() => ZustandMMKVStorage),
			partialize: (state) =>
				Object.fromEntries(
					Object.entries(state).filter(([key]) => !['isReading', 'showControls'].includes(key)),
				),
			version: 1,
		},
	),
)

type Params = {
	book: ImageReaderBookRef
	serverId?: string
}

export const useBookPreferences = ({ book, ...params }: Params) => {
	const serverCtx = useActiveServerSafe()

	const serverID = serverCtx?.activeServer.id || params.serverId

	if (!serverID) {
		throw new Error('No active server ID found for book preferences')
	}

	const bookSettingsMap = useReaderStore((state) => state.bookSettings)
	const globalSettings = useReaderStore((state) => state.globalSettings)
	const bookOverrides = useReaderStore((state) => state.bookOverrides)
	const addBookSettings = useReaderStore((state) => state.addBookSettings)
	const setBookSettingsFn = useReaderStore((state) => state.setBookSettings)
	const setGlobalSettings = useReaderStore((state) => state.setGlobalSettings)

	const bookSettings = useMemo(() => bookSettingsMap[book.id], [bookSettingsMap, book.id])
	const overrideGlobalSettings = useMemo(() => bookOverrides[book.id], [bookOverrides, book.id])

	const setBookPreferences = useCallback(
		(updates: Partial<BookPreferences>) => {
			if (!bookSettings) {
				addBookSettings(book.id, {
					...globalSettings,
					...updates,
					serverID,
				})
			} else {
				setBookSettingsFn(book.id, { ...updates, serverID })
			}
		},
		[book.id, bookSettings, addBookSettings, globalSettings, setBookSettingsFn, serverID],
	)

	return {
		globalSettings,
		overrideGlobalSettings,
		preferences: {
			...globalSettings,
			...(overrideGlobalSettings && bookSettings ? bookSettings : {}),
		},
		setBookPreferences,
		updateGlobalSettings: setGlobalSettings,
	}
}

export const useHideSystemBars = () => {
	const { isReading, showControls } = useReaderStore(
		useShallow((state) => ({
			isReading: state.isReading,
			showControls: state.showControls,
		})),
	)

	// when reading, hideNavigationBar keep the android and iPad nav bar hidden
	return { hideStatusBar: isReading && !showControls, hideNavigationBar: isReading }
}
