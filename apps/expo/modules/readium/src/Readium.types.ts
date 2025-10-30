import type { StyleProp, ViewStyle } from 'react-native'

export type {
	BookLoadedEvent as PDFBookLoadedEvent,
	PDFErrorEvent,
	PDFLocator,
	LocatorChangeEvent as PDFLocatorChangeEvent,
	PageChangeEvent as PDFPageChangeEvent,
	PDFPreferences,
	PDFScrollAxis,
	PDFViewProps,
	PDFViewRef,
} from './PDFView'

export type ReadingDirection = 'ltr' | 'rtl'
export type ReadingMode = 'paged' | 'scrolled'

export type ReadiumLocation = {
	fragments?: string[] | null
	progression?: number | null
	position?: number | null
	totalProgression?: number | null
	cssSelector?: string | null
	partialCfi?: string | null
}

export type ReadiumLocator = {
	chapterTitle: string
	href: string
	title?: string | null
	locations?: ReadiumLocation | null
	text?: {
		after?: string | null
		before?: string | null
		highlight?: string | null
	} | null
	type?: string | null
}

export type ReadiumLink = {
	href: string
	type?: string
	title?: string
	rel?: string | string[]
	properties?: Record<string, unknown>
}

export type ReadiumManifest = {
	'@context': string | string[]
	metadata: {
		identifier?: string
		title: string
		author?: string | string[]
		publisher?: string
		language?: string
		description?: string
		numberOfPages?: number
	}
	links: ReadiumLink[]
	readingOrder: ReadiumLink[]
	resources?: ReadiumLink[]
	toc?: ReadiumLink[]
}

export type OnLoadEventPayload = {
	url: string
}

export type OnPageChangeEventPayload = {
	currentPage: number
	totalPages: number
	progress: number
	chapterTitle?: string
	// FIXME: Uh oh: https://github.com/readium/swift-toolkit/issues/467#issuecomment-2263479610
	// epubcfi?: string
	rawLocation: ReadiumLocator
}

export type ReadiumModuleEvents = {
	onChange: (params: ChangeEventPayload) => void
	onBookLoaded: (params: { success: boolean; error?: string; bookMetadata?: BookMetadata }) => void
	onLocatorChange: (params: ReadiumLocator) => void
	onMiddleTouch: () => void
	onSelection: (params: {
		cleared?: boolean
		x?: number
		y?: number
		locator?: ReadiumLocator
	}) => void
	onDoubleTouch: (params: ReadiumLocator) => void
	onError: (params: {
		errorDescription: string
		failureReason: string
		recoverySuggestion: string
	}) => void
}

export type ChangeEventPayload = {
	value: string
}

export type BookMetadata = {
	title: string
	author?: string
	publisher?: string
	identifier?: string
	language?: string
	totalPages: number
	chapterCount: number
}

export type EPUBReaderThemeConfig = {
	fontSize?: number
	fontFamily?: string
	lineHeight?: number
	brightness?: number
	colors?: {
		background: string
		foreground: string
		// highlight: string
	}
}

export type EPUBReaderConfig = {
	readingMode?: ReadingMode
	readingDirection?: ReadingDirection
} & EPUBReaderThemeConfig

export type ReadiumViewProps = {
	bookId: string
	url: string
	locator?: ReadiumLocator
	initialLocator?: ReadiumLocator
	onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void
	onBookLoaded?: (event: {
		nativeEvent: { success: boolean; error?: string; bookMetadata?: BookMetadata }
	}) => void
	onLayoutChange?: (event: { nativeEvent: { bookMetadata?: BookMetadata } }) => void
	onLocatorChange?: (event: { nativeEvent: ReadiumLocator }) => void
	onMiddleTouch?: (event: { nativeEvent: void }) => void
	onSelection?: (event: {
		nativeEvent: { cleared?: boolean; x?: number; y?: number; locator?: ReadiumLocator }
	}) => void
	// onHighlightTap
	onDoubleTouch?: (event: { nativeEvent: ReadiumLocator }) => void
	onError?: (event: {
		nativeEvent: { errorDescription: string; failureReason: string; recoverySuggestion: string }
	}) => void
	style?: StyleProp<ViewStyle>
} & EPUBReaderConfig

export interface EPUBLocation {
	epubcfi: string
	href?: string
	created: Date
	title?: string
	chapter?: string
	progress: number
	pageNumber?: number
}

export interface EPUBBookmark extends EPUBLocation {
	id: string
}

export interface EPUBHighlight extends EPUBLocation {
	id: string
	color: string
	text: string
}

export type ReadiumViewRef = {
	goToLocation: (locator: ReadiumLocator) => Promise<void>
	goForward: () => Promise<void>
	goBackward: () => Promise<void>
	destroy: () => Promise<void>
}
