import type { ReadingDirection, ReadingMode } from '@stump/types'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

type ReaderMode = 'continuous' | 'paged'

type OldReaderStore = {
	mode: ReaderMode
	setMode: (mode: ReaderMode) => void
	showToolBar: boolean
	setShowToolBar: (show: boolean) => void
	preloadAheadCount: number
	preloadBehindCount: number
	setPreloadAheadCount: (count: number) => void
	setPreloadBehindCount: (count: number) => void
}

export const createReaderStore = (storage?: StateStorage) =>
	create<OldReaderStore>()(
		devtools(
			persist(
				(set) =>
					({
						mode: 'paged',
						preloadAheadCount: 5,
						preloadBehindCount: 3,
						setMode: (mode) => set({ mode }),
						setPreloadAheadCount: (count) => set({ preloadAheadCount: count }),
						setPreloadBehindCount: (count) => set({ preloadBehindCount: count }),
						setShowToolBar: (show) => set({ showToolBar: show }),
						showToolBar: false,
					}) as ReaderStore,
				{
					name: 'stump-reader-store',
					storage: storage ? createJSONStorage(() => storage) : undefined,
					version: 1,
				},
			),
		),
	)

export type BookImageScalingFit = 'width' | 'height' | 'none'
export type BookImageScaling = {
	scaleToFit: BookImageScalingFit
}

/**
 * The preferences for a book, which represents an override of a user's default preferences for a
 * specific book
 */
export type BookPreferences = {
	// TODO: might be better in settings...
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
	 * Whether the reader should be in double spread mode. This will have no effect if the reader
	 * mode is set to `continuous`
	 */
	doubleSpread?: boolean
	/**
	 * The font size to use for the book. This will have no effect if the book is image-based
	 */
	fontSize?: number
	/**
	 * The font family to use for the book. This will have no effect if the book is image-based
	 */
	fontFamily?: string
	/**
	 * The theme to use for the book. This will have no effect if the book is image-based
	 */
	theme?: string
	/**
	 * The image scaling preferences for the book. This will have no effect if the book is not an image-based book
	 */
	imageScaling: BookImageScaling
}

/**
 * A type alias for a book ID
 */
type BookID = string

/**
 * The store for the reader itself, less specific to a single book and more about the reader
 */
type ReaderStore = {
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
}

export type NewReaderStore = {
	/**
	 * The preferences for the reader
	 */
	settings: ReaderStore
	/**
	 * A setter for the layout preferences
	 */
	setSettings: (settings: Partial<ReaderStore>) => void
	/**
	 * The preferences for each book, if they have been overridden from the default preferences
	 */
	bookPreferences: Record<BookID, BookPreferences>
	/**
	 * A setter for a *specific* book's preferences
	 */
	setBookPreferences: (id: BookID, preferences: BookPreferences) => void
}

export const createNewReaderStore = (storage?: StateStorage) =>
	create<NewReaderStore>()(
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
						setSettings: (settings) => set({ settings: { ...get().settings, ...settings } }),
						settings: {
							preload: {
								ahead: 5,
								behind: 3,
							},
							showToolBar: false,
						},
					}) as NewReaderStore,
				{
					name: 'stump-new-reader-store',
					storage: storage ? createJSONStorage(() => storage) : undefined,
					version: 3,
				},
			),
		),
	)
