import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { BookmarkRef, EbookReaderBookRef } from '~/components/book/reader/image/context'
import { COLORS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import {
	BookMetadata,
	EPUBReaderThemeConfig,
	NativeTableOfContentsItem,
	ReadiumLocator,
	ReadiumViewRef,
} from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

export { BookmarkRef } from '~/components/book/reader/image/context'

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

export type TocSource = 'native' | 'server'

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

	onTocChange: (toc: TableOfContentsItem[] | string[], source: TocSource) => void
	onBookLoad: (metadata?: BookMetadata) => void
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
	onBookLoad: (metadata) =>
		set({
			totalPages: metadata?.totalPages ?? 0,
			embeddedMetadata: metadata,
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
		}),
}))

const defaultThemes: Record<string, EPUBReaderThemeConfig> = {
	Light: {
		colors: {
			background: COLORS.light.background.DEFAULT,
			foreground: COLORS.light.foreground.DEFAULT,
		},
	},
	Dark: {
		colors: {
			background: COLORS.dark.background.DEFAULT,
			foreground: COLORS.dark.foreground.DEFAULT,
		},
	},
	Papyrus: {
		colors: {
			background: '#e7d3b5',
			foreground: '#423328',
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
