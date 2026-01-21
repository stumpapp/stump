import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { BookmarkRef, EbookReaderBookRef } from '~/components/book/reader/image/context'
import { COLORS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import {
	BookMetadata,
	Decoration,
	EPUBReaderThemeConfig,
	NativeTableOfContentsItem,
	ReadiumLocator,
	ReadiumViewRef,
} from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

export { BookmarkRef } from '~/components/book/reader/image/context'
export type { Decoration } from '~/modules/readium'

export const trimFragmentFromHref = (href: string) => {
	return href.split('#')[0]
}

export const findTocItemByHref = (
	toc: TableOfContentsItem[],
	href: string,
): TableOfContentsItem | undefined => {
	const targetHref = trimFragmentFromHref(href)
	for (const item of toc) {
		if (trimFragmentFromHref(item.content) === targetHref) {
			return item
		}
		if (item.children.length > 0) {
			const found = findTocItemByHref(item.children, href)
			if (found) return found
		}
	}
	return undefined
}

export type TableOfContentsItem = {
	label: string
	content: string
	children: TableOfContentsItem[]
	play_order: number
}

export const convertNativeToc = (items: NativeTableOfContentsItem[]): TableOfContentsItem[] => {
	return items.map((item) => ({
		...item,
		children: item.children ? convertNativeToc(item.children) : [],
	}))
}

export const parseToc = (toc?: string[]): TableOfContentsItem[] => {
	if (!toc) return []

	const parsedToc = toc
		.map((item) => {
			try {
				return JSON.parse(item) as TableOfContentsItem
			} catch (e) {
				console.error('Failed to parse toc item', item, e)
				return null
			}
		})
		.filter((item) => item !== null) as TableOfContentsItem[]

	return parsedToc
}

export type EmbeddedMetadata = Pick<BookMetadata, 'title' | 'author' | 'language' | 'publisher'>

export type OnBookmarkCallback = (
	locator: ReadiumLocator,
	previewContent?: string,
) => Promise<{ id: string } | void>

export type OnCreateAnnotationCallback = (
	locator: ReadiumLocator,
	annotationText?: string,
) => Promise<{ id: string }>

export type OnUpdateAnnotationCallback = (
	annotationId: string,
	annotationText: string | null,
) => Promise<void>

export type OnDeleteAnnotationCallback = (annotationId: string) => Promise<void>

export type TocSource = 'native' | 'server'

// FIXME: This store has gotten way out of control. Originally, I shoved all this in a store
// because I was using expo router for navigation between various sheets within the reader stack,
// however since moving to a programmatic sheet we don't need the store necessarily any more. I
// kept the same approach for annotations, mostly because I don't have the time to rethink it and refactor,
// however it should be done at some point down the road

export type IEpubLocationStore = {
	book?: EbookReaderBookRef
	storeBook: (book: EbookReaderBookRef) => void
	actions?: ReadiumViewRef | null
	storeActions: (actions: ReadiumViewRef | null) => void

	requestHeaders?: () => Record<string, string>
	storeHeaders: (callback: (() => Record<string, string>) | undefined) => void

	locator?: ReadiumLocator
	currentChapter: string
	position: number
	totalPages: number
	toc: TableOfContentsItem[]
	tocSource: TocSource | null
	embeddedMetadata?: EmbeddedMetadata
	positions: ReadiumLocator[]

	onTocChange: (toc: TableOfContentsItem[] | string[], source: TocSource) => void
	onBookLoad: (metadata?: BookMetadata, positions?: ReadiumLocator[]) => void
	onLocationChange: (locator: ReadiumLocator) => void
	onUnload: () => void

	bookmarks: BookmarkRef[]
	storeBookmarks: (bookmarks: BookmarkRef[]) => void
	addBookmark: (bookmark: BookmarkRef) => void
	removeBookmark: (bookmarkId: string) => void
	isCurrentLocationBookmarked: () => boolean
	getCurrentLocationBookmark: () => BookmarkRef | undefined

	onBookmark?: OnBookmarkCallback
	storeOnBookmark: (callback: OnBookmarkCallback | undefined) => void
	onDeleteBookmark?: (bookmarkId: string) => Promise<void>
	storeOnDeleteBookmark: (callback: ((bookmarkId: string) => Promise<void>) | undefined) => void

	annotations: Decoration[]
	storeAnnotations: (annotations: Decoration[]) => void
	addAnnotation: (annotation: Decoration) => void
	updateAnnotation: (annotation: Decoration) => void
	removeAnnotation: (annotationId: string) => void
	getAnnotation: (annotationId: string) => Decoration | undefined

	onCreateAnnotation?: OnCreateAnnotationCallback
	storeOnCreateAnnotation: (callback: OnCreateAnnotationCallback | undefined) => void
	onUpdateAnnotation?: OnUpdateAnnotationCallback
	storeOnUpdateAnnotation: (callback: OnUpdateAnnotationCallback | undefined) => void
	onDeleteAnnotation?: OnDeleteAnnotationCallback
	storeOnDeleteAnnotation: (callback: OnDeleteAnnotationCallback | undefined) => void
}

export const useEpubLocationStore = create<IEpubLocationStore>((set, get) => ({
	storeBook: (book) => set({ book }),
	storeActions: (ref) => set({ actions: ref }),

	requestHeaders: undefined,
	storeHeaders: (callback) => set({ requestHeaders: callback }),

	currentChapter: '',
	position: 0,
	totalPages: 0,
	toc: [],
	tocSource: null,
	positions: [],

	onTocChange: (toc, source) => {
		if (typeof toc[0] === 'string') {
			set({
				toc: parseToc(toc as string[]),
				tocSource: source,
			})
		} else {
			set({
				toc: toc as TableOfContentsItem[],
				tocSource: source,
			})
		}
	},
	onBookLoad: (metadata, positions) =>
		set({
			totalPages: metadata?.totalPages ?? 0,
			embeddedMetadata: metadata,
			positions: positions ?? [],
		}),
	onLocationChange: (locator) =>
		set({
			currentChapter: locator.chapterTitle,
			position: locator.locations?.position ?? 0,
			locator,
		}),

	bookmarks: [],
	storeBookmarks: (bookmarks) => set({ bookmarks }),
	addBookmark: (bookmark) =>
		set((state) => ({
			bookmarks: [...state.bookmarks, bookmark],
		})),
	removeBookmark: (bookmarkId) =>
		set((state) => ({
			bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
		})),
	isCurrentLocationBookmarked: () => {
		const state = get()
		if (!state.locator) return false
		return state.bookmarks.some(
			(b) =>
				trimFragmentFromHref(b.href) === trimFragmentFromHref(state.locator!.href) &&
				b.locations?.progression === state.locator!.locations?.progression,
		)
	},
	getCurrentLocationBookmark: () => {
		const state = get()
		if (!state.locator) return undefined
		return state.bookmarks.find(
			(b) =>
				trimFragmentFromHref(b.href) === trimFragmentFromHref(state.locator!.href) &&
				b.locations?.progression === state.locator!.locations?.progression,
		)
	},

	onBookmark: undefined,
	storeOnBookmark: (callback) => set({ onBookmark: callback }),
	onDeleteBookmark: undefined,
	storeOnDeleteBookmark: (callback) => set({ onDeleteBookmark: callback }),

	annotations: [],
	storeAnnotations: (annotations) => set({ annotations }),
	addAnnotation: (annotation) =>
		set((state) => ({
			annotations: [...state.annotations, annotation],
		})),
	updateAnnotation: (annotation) =>
		set((state) => ({
			annotations: state.annotations.map((a) => (a.id === annotation.id ? annotation : a)),
		})),
	removeAnnotation: (annotationId) =>
		set((state) => ({
			annotations: state.annotations.filter((a) => a.id !== annotationId),
		})),
	getAnnotation: (annotationId) => {
		return get().annotations.find((a) => a.id === annotationId)
	},

	onCreateAnnotation: undefined,
	storeOnCreateAnnotation: (callback) => set({ onCreateAnnotation: callback }),
	onUpdateAnnotation: undefined,
	storeOnUpdateAnnotation: (callback) => set({ onUpdateAnnotation: callback }),
	onDeleteAnnotation: undefined,
	storeOnDeleteAnnotation: (callback) => set({ onDeleteAnnotation: callback }),

	onUnload: () =>
		set({
			currentChapter: '',
			position: 0,
			totalPages: 0,
			toc: [],
			tocSource: null,
			book: undefined,
			embeddedMetadata: undefined,
			actions: null,
			bookmarks: [],
			onBookmark: undefined,
			onDeleteBookmark: undefined,
			annotations: [],
			onCreateAnnotation: undefined,
			onUpdateAnnotation: undefined,
			onDeleteAnnotation: undefined,
		}),
}))

// TODO(highlights): Think through highlight colors that make sense for each preset theme
const defaultThemes: Record<string, EPUBReaderThemeConfig> = {
	Light: {
		colors: {
			background: COLORS.light.background.DEFAULT,
			foreground: COLORS.light.foreground.DEFAULT,
			highlight: '#FFEB3B',
		},
	},
	Dark: {
		colors: {
			background: COLORS.dark.background.DEFAULT,
			foreground: COLORS.dark.foreground.DEFAULT,
			highlight: '#FFEB3B',
		},
	},
	Papyrus: {
		colors: {
			background: '#e7d3b5',
			foreground: '#423328',
			highlight: '#FFEB3B',
		},
	},
}

export type StoredConfig = Pick<EPUBReaderThemeConfig, 'colors'>

export type Color = keyof NonNullable<StoredConfig['colors']>

export type IEpubThemesStore = {
	selectedTheme?: string
	themes: Record<string, StoredConfig>
	addTheme: (name: string, config: StoredConfig) => void
	deleteTheme: (name: string) => void
	selectTheme: (name: string) => void
	resetThemes: () => void
}

export const useEpubThemesStore = create<IEpubThemesStore>()(
	persist(
		(set) =>
			({
				selectedTheme: undefined,
				themes: defaultThemes,
				addTheme: (name, config) =>
					set((state) => ({
						themes: {
							...state.themes,
							[name]: config,
						},
					})),
				deleteTheme: (name) =>
					set((state) => {
						const newThemes = { ...state.themes }
						delete newThemes[name]
						return { themes: newThemes }
					}),
				selectTheme: (name) => set({ selectedTheme: name }),
				resetThemes: () => set({ themes: defaultThemes }),
			}) satisfies IEpubThemesStore,
		{
			name: 'stump-epub-themes-store',
			storage: createJSONStorage(() => ZustandMMKVStorage),
			version: 2,
		},
	),
)

export const resolveTheme = (
	themes: Record<string, StoredConfig>,
	themeName: string,
	colorScheme: 'light' | 'dark',
): StoredConfig => {
	const theme = themes[themeName]
	return theme ?? ((colorScheme === 'dark' ? themes.Dark : themes.Light) as StoredConfig)
}

export const resolveThemeName = (
	themes: Record<string, StoredConfig>,
	themeName: string | undefined,
	colorScheme: 'light' | 'dark',
): string => {
	if (themeName && themes[themeName]) {
		return themeName
	}

	return colorScheme === 'dark' ? 'Dark' : 'Light'
}

export const useEpubTheme = () => {
	const { colorScheme } = useColorScheme()
	const { themes, selectedTheme } = useEpubThemesStore((store) => ({
		themes: store.themes,
		selectedTheme: store.selectedTheme,
	}))

	return useMemo(
		() => resolveTheme(themes, selectedTheme || '', colorScheme),
		[themes, selectedTheme, colorScheme],
	)
}

export type SupportedMobileFont =
	| 'OpenDyslexic'
	| 'Literata'
	| 'Atkinson-Hyperlegible'
	| 'CharisSIL'
	| 'Bitter'

export const Fonts = [
	{ label: 'OpenDyslexic', value: 'OpenDyslexic' },
	{ label: 'Literata', value: 'Literata' },
	{ label: 'Atkinson Hyperlegible', value: 'Atkinson-Hyperlegible' },
	{ label: 'Charis SIL', value: 'CharisSIL' },
	{ label: 'Bitter', value: 'Bitter' },
] satisfies { label: string; value: SupportedMobileFont }[]

export const getFontPath = (font: SupportedMobileFont) => {
	switch (font) {
		case 'OpenDyslexic':
			return 'OpenDyslexic-Regular'
		case 'Literata':
			return 'Literata'
		case 'Atkinson-Hyperlegible':
			return 'Atkinson Hyperlegible'
		case 'CharisSIL':
			return 'CharisSIL'
		case 'Bitter':
			return 'Bitter'
	}
}
