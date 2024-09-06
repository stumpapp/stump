import type { ReadingDirection } from '@stump/types'
import { create } from 'zustand'
import { createJSONStorage, devtools, persist, StateStorage } from 'zustand/middleware'

type ReaderMode = 'continuous' | 'paged'

type ReaderStore = {
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
	create<ReaderStore>()(
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

/**
 * The preferences for a book, which represents an override of a user's default preferences for a
 * specific book
 */
type BookPreferences = {
	/**
	 * The reading direction of the book. There are two possible values: `ltr` and `rtl`. However,
	 * this value will be ignored if the reader mode is set to `continuous`. This will change once
	 * the reader supports horizontal scrolling
	 */
	readingDirection: ReadingDirection
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
}

/**
 * A type alias for a book ID
 */
type BookID = string

type ReaderLayout = {
	/**
	 * The current reader mode
	 */
	mode?: ReaderMode
	/**
	 * Whether the reader should be in double spread mode. This will have no effect if the reader
	 * mode is set to `continuous`
	 */
	doubleSpread?: boolean
	/**
	 * Whether the toolbar should be shown
	 */
	showToolBar: boolean
	/**
	 * The number of pages to preload ahead of the current page. This will have no effect if the book
	 * is not an image-based book
	 */
	preloadAheadCount: number
	/**
	 * The number of pages to preload behind the current page. This will have no effect if the book
	 * is not an image-based book
	 */
	preloadBehindCount: number
}

export type NewReaderStore = {
	/**
	 * The layout preferences for the reader
	 */
	layout: ReaderLayout
	/**
	 * A setter for the layout preferences
	 */
	setLayout: (layout: Partial<ReaderLayout>) => void
	bookPreferences: Record<BookID, BookPreferences>
	setBookPreferences: (id: BookID, preferences: BookPreferences) => void
}

export const createNewReaderStore = (storage?: StateStorage) =>
	create<NewReaderStore>()(
		devtools(
			persist(
				(set, get) =>
					({
						bookPreferences: {},
						layout: {
							doubleSpread: false,
							mode: 'paged',
							preloadAheadCount: 5,
							preloadBehindCount: 3,
							showToolBar: false,
						},
						setBookPreferences: (id, preferences) => {
							const existingPreferences = get().bookPreferences[id]
							set({
								bookPreferences: {
									...get().bookPreferences,
									[id]: { ...existingPreferences, ...preferences },
								},
							})
						},
						setLayout: (layout) => set({ layout: { ...get().layout, ...layout } }),
					}) as NewReaderStore,
				{
					name: 'stump-new-reader-store',
					storage: storage ? createJSONStorage(() => storage) : undefined,
					version: 1,
				},
			),
		),
	)
