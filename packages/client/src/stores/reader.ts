import type { ReadingDirection, ReadingMode } from '@stump/sdk'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

export type BookImageScalingFit = 'auto' | 'width' | 'height' | 'none'
export type BookImageScaling = {
	scaleToFit: BookImageScalingFit
}

export type DoublePageBehavior = 'auto' | 'always' | 'off'
export const isDoublePageBehavior = (value: string): value is DoublePageBehavior =>
	['auto', 'always', 'off'].includes(value)

/**
 * The preferences for a book, which represents an override of a user's default preferences for a
 * specific book
 */
export type BookPreferences = {
	/**
	 * A brightness value for the book, which will apply a filter to dim / brighten the page.
	 * This must be a value between 0 and 1.
	 */
	brightness: number
	/**
	 * The current reader mode
	 */
	readingMode: ReadingMode
	/**
	 * The reading direction of the book. There are two possible values: `ltr` and `rtl`.
	 */
	readingDirection: ReadingDirection
	/**
	 * The behavior for double-page spreads
	 */
	doublePageBehavior?: DoublePageBehavior
	/**
	 * The font size to use for the book. This will have no effect if the book is image-based
	 */
	fontSize?: number
	/**
	 * The font family to use for the book. This will have no effect if the book is image-based
	 */
	fontFamily?: string
	/**
	 * The line height to use for the book. This will have no effect if the book is image-based
	 */
	lineHeight?: number
	/**
	 * The theme to use for the book. This will have no effect if the book is image-based
	 */
	theme?: string
	/**
	 * The image scaling preferences for the book. This will have no effect if the book is not an image-based book
	 */
	imageScaling: BookImageScaling
	/**
	 * The behavior for tapping the sides of the screen to navigate
	 */
	tapSidesToNavigate: boolean
	/**
	 * Whether or not to track elapsed time for the book
	 */
	trackElapsedTime: boolean
	/**
	 * Whether or not the page 2 should be displayed separately. This will have no effect if the book is not image-based
	 */
	secondPageSeparate: boolean
}

/**
 * A type alias for a book ID
 */
type BookID = string

/**
 * The store for the reader itself, less specific to a single book and more about the reader
 */
export type ReaderSettings = {
	/**
	 * Whether the toolbar should be shown
	 */
	showToolBar: boolean
	/**
	 * The preferences for preloading pages
	 */
	preload: {
		/**
		 * The number of pages to preload ahead of the current page. This will have no effect if the book
		 * is not an image-based book
		 */
		ahead: number
		/**
		 * The number of pages to preload behind the current page. This will have no effect if the book
		 * is not an image-based book
		 */
		behind: number
	}
} & BookPreferences

type ElapsedSeconds = number

export type ReaderStore = {
	/**
	 * The preferences for the reader
	 */
	settings: ReaderSettings
	/**
	 * A setter for the layout preferences
	 */
	setSettings: (settings: Partial<ReaderSettings>) => void
	/**
	 * The preferences for each book, if they have been overridden from the default preferences
	 */
	bookPreferences: Record<BookID, BookPreferences>

	bookTimers: Record<BookID, ElapsedSeconds>
	setBookTimer: (id: string, timer: ElapsedSeconds) => void

	/**
	 * A function to clear the store
	 */
	clearStore: () => void
	/**
	 * A setter for a *specific* book's preferences
	 */
	setBookPreferences: (id: BookID, preferences: BookPreferences) => void
}

export const DEFAULT_BOOK_PREFERENCES = {
	fontSize: 13,
	lineHeight: 1.5,
	brightness: 1,
	readingMode: 'paged',
	readingDirection: 'ltr',
	imageScaling: {
		scaleToFit: 'height',
	},
	doublePageBehavior: 'auto',
	secondPageSeparate: false,
	trackElapsedTime: true,
	tapSidesToNavigate: true,
} as const

export const createReaderStore = (storage?: StateStorage) =>
	create<ReaderStore>()(
		devtools(
			persist(
				(set, get) =>
					({
						bookPreferences: {},
						setBookPreferences: (id, preferences) => {
							const existingPreferences = get().bookPreferences[id]
							set({
								bookPreferences: {
									...get().bookPreferences,
									[id]: { ...existingPreferences, ...preferences },
								},
							})
						},

						bookTimers: {},
						setBookTimer: (id, elapsedSeconds) =>
							set({ bookTimers: { ...get().bookTimers, [id]: elapsedSeconds } }),

						clearStore: () =>
							set({
								bookPreferences: {},
							}),
						setSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),
						settings: {
							preload: {
								ahead: 5,
								behind: 3,
							},
							showToolBar: false,
							...DEFAULT_BOOK_PREFERENCES,
						},
					}) as ReaderStore,
				{
					name: 'stump-new-reader-store',
					storage: storage ? createJSONStorage(() => storage) : undefined,
					version: 3,
				},
			),
		),
	)
