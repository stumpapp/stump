import { Bookmark } from '@stump/graphql'
import { createContext, useContext } from 'react'

import { ImageReaderBookRef } from '@/components/readers/imageBased/context'

import { noop } from '../../../utils/misc'

export type ReaderLocator = {
	href: string
	type: string
	title?: string
	chapterTitle?: string
	locations?: {
		fragments?: string[] | null
		progression?: number | null
		position?: number | null
		totalProgression?: number | null
	} | null
	text?: {
		after?: string | null
		before?: string | null
		highlight?: string | null
	} | null
}

export type EpubReaderChapterMeta = {
	/** The chapter's title. */
	name?: string
	/** The chapter's position in the book / TOC index. */
	position?: number
	/** The chapter's index in the spine / reading order */
	sectionSpineIndex?: number
	/** Absolute or relative progression for footer UI (0–1). */
	totalProgression?: number
	/** 1-based Readium position index when available. */
	locatorPosition?: number
	/** Total positions in the publication. */
	totalPositions?: number
	/**
	 * Current locator for progress and bookmarks.
	 * Preferred over epubcfi for the Readium reader.
	 */
	currentLocator?: ReaderLocator | null
	/**
	 * Legacy epub.js page display.
	 */
	totalPages?: number
	currentPage?: [number | undefined, number | undefined]
	cfiRange?: [string | undefined, string | undefined]
}

export interface EpubContent {
	label: string
	content: string
	children: EpubContent[]
	play_order: number
}

export type EpubReaderBookMeta = {
	chapter: EpubReaderChapterMeta
	toc: EpubContent[]
	/** Legacy epub.js section lengths — unused by Readium. */
	sectionLengths: { [key: number]: number }
	bookmarks: Record<string, Bookmark>
}

export type EpubReaderMeta = {
	bookEntity: ImageReaderBookRef
	bookMeta: EpubReaderBookMeta | null
	progress: number | null
}

export type EpubReaderControls = {
	visible: boolean
	fullscreen: boolean
	setFullscreen: (fullscreen: boolean) => void
	setVisible: (visible: boolean) => void
	onMouseEnterControls: () => void
	onMouseLeaveControls: () => void
	onLinkClick: (href: string) => void
	onPaginateForward: () => void
	onPaginateBackward: () => void
	jumpToSection: (section: number) => void
	/** Navigate using a Readium locator (preferred). */
	onGoToLocator: (locator: ReaderLocator) => void
	/** Preview text for a locator-based bookmark. */
	getLocatorPreviewText: (locator: ReaderLocator) => Promise<string | null>
	/**
	 * Legacy epub.js CFI navigation — optional; SearchCommand/Bookmarks fall back when present.
	 */
	onGoToCfi?: (cfi: string) => void
	getCfiPreviewText?: (cfi: string) => Promise<string | null>
	searchEntireBook?: (query: string) => Promise<SpineSearchResult[]>
}

export type SpineSearchResult = {
	results: SearchResult[]
	spineIndex: number
}

export type SearchResult = {
	cfi: string
	excerpt: string
}

export type EpubReaderContextProps = {
	readerMeta: EpubReaderMeta
	controls: EpubReaderControls
}

export const EpubReaderContext = createContext<EpubReaderContextProps>({
	controls: {
		fullscreen: false,
		getLocatorPreviewText: async () => null,
		onGoToLocator: noop,
		onLinkClick: noop,
		onMouseEnterControls: noop,
		onMouseLeaveControls: noop,
		onPaginateBackward: noop,
		onPaginateForward: noop,
		jumpToSection: noop,
		setFullscreen: noop,
		setVisible: noop,
		visible: false,
	},
	readerMeta: {
		bookEntity: {} as ImageReaderBookRef,
		bookMeta: null,
		progress: null,
	},
})
export const useEpubReaderContext = () => useContext<EpubReaderContextProps>(EpubReaderContext)
export const useEpubReaderControls = () => useEpubReaderContext().controls
