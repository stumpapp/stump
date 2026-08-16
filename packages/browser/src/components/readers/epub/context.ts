import { Bookmark } from '@stump/graphql'
import type { EpubSearchResponse } from '@stump/sdk'
import { createContext, useContext } from 'react'

import { ImageReaderBookRef } from '@/components/readers/imageBased/context'

import { noop } from '../../../utils/misc'
import type { EpubAnnotation } from './annotations/types'

export type { EpubSearchResponse, EpubSearchResult } from '@stump/sdk'

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
		cssSelector?: string | null
		partialCfi?: string | null
	} | null
	text?: {
		after?: string | null
		before?: string | null
		highlight?: string | null
	} | null
}

export type EpubReaderChapterMeta = {
	name?: string
	position?: number
	sectionSpineIndex?: number
	totalProgression?: number
	locatorPosition?: number
	totalPositions?: number
	currentLocator?: ReaderLocator | null
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
	bookmarks: Record<string, Bookmark>
	annotations: EpubAnnotation[]
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
	canGoForward?: boolean
	canGoBackward?: boolean
	onGoToLocator: (locator: ReaderLocator) => void
	getLocatorPreviewText: (locator: ReaderLocator) => string | null
	searchBook?: (
		query: string,
		opts?: { cursor?: string; signal?: AbortSignal },
	) => Promise<EpubSearchResponse>
}

export type EpubReaderContextProps = {
	readerMeta: EpubReaderMeta
	controls: EpubReaderControls
}

export const EpubReaderContext = createContext<EpubReaderContextProps>({
	controls: {
		fullscreen: false,
		getLocatorPreviewText: () => null,
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
