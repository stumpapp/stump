import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { EbookReaderBookRef } from '~/components/book/reader/image/context'
import { COLORS } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import {
	BookMetadata,
	EPUBReaderThemeConfig,
	ReadiumLocator,
	ReadiumViewRef,
} from '~/modules/readium'

import { ZustandMMKVStorage } from './store'

export type TableOfContentsItem = {
	label: string
	content: string
	children: TableOfContentsItem[]
	play_order: number
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

export const trimFragmentFromHref = (href: string) => {
	return href.split('#')[0]
}

export const parseFragmentFromHref = (href: string) => href.split('#')

export type EmbeddedMetadata = Pick<BookMetadata, 'title' | 'author' | 'language' | 'publisher'>

export type IEpubLocationStore = {
	book?: EbookReaderBookRef
	storeBook: (book: EbookReaderBookRef) => void
	actions?: ReadiumViewRef | null
	storeActions: (actions: ReadiumViewRef | null) => void

	requestHeaders?: () => Record<string, string>
	storeHeaders: (callback: (() => Record<string, string>) | undefined) => void

	currentChapter: string
	position: number
	totalPages: number
	toc: TableOfContentsItem[]
	embeddedMetadata?: EmbeddedMetadata

	onTocChange: (toc: TableOfContentsItem[] | string[]) => void
	onBookLoad: (metadata?: BookMetadata) => void
	onLocationChange: (locator: ReadiumLocator) => void
	onUnload: () => void
}

export const useEpubLocationStore = create<IEpubLocationStore>((set) => ({
	storeBook: (book) => set({ book }),
	storeActions: (ref) => set({ actions: ref }),

	requestHeaders: undefined,
	storeHeaders: (callback) => set({ requestHeaders: callback }),

	currentChapter: '',
	position: 0,
	totalPages: 0,
	toc: [],

	onTocChange: (toc) => {
		if (typeof toc[0] === 'string') {
			set({
				toc: parseToc(toc as string[]),
			})
		} else {
			set({
				toc: toc as TableOfContentsItem[],
			})
		}
	},
	onBookLoad: (metadata) =>
		set({
			totalPages: metadata?.totalPages ?? 0,
			embeddedMetadata: metadata,
		}),
	onLocationChange: (locator) =>
		set({ currentChapter: locator.chapterTitle, position: locator.locations?.position ?? 0 }),

	onUnload: () =>
		set({
			currentChapter: '',
			position: 0,
			totalPages: 0,
			toc: [],
			book: undefined,
			embeddedMetadata: undefined,
			actions: null,
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
	Sepia: {
		colors: {
			background: '#F5E9D3',
			foreground: '#5B4636',
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
			version: 1,
		},
	),
)

export const resolveTheme = (
	themes: Record<string, StoredConfig>,
	themeName: string,
	colorScheme: 'light' | 'dark',
): StoredConfig => {
	const theme = themes[themeName]
	return theme ?? (colorScheme === 'dark' ? themes.Dark : themes.Light)
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
