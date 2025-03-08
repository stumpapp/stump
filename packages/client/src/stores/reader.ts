import type { ReadingDirection, ReadingMode } from '@stump/sdk'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

export type BookImageScalingFit = 'width' | 'height' | 'none'
export type BookImageScaling = {
	scaleToFit: BookImageScalingFit
}

export type DoublePageBehavior = 'auto' | 'always' | 'off'

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

	/**
	 * A function to clear the store
	 */
	clearStore: () => void
	/**
	 * A setter for a *specific* book's preferences
	 */
	setBookPreferences: (id: BookID, preferences: BookPreferences) => void
}

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
							fontSize: 13,
							brightness: 1,
							readingMode: 'paged',
							readingDirection: 'ltr',
							imageScaling: {
								scaleToFit: 'height',
							},
							doublePageBehavior: 'off',
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
