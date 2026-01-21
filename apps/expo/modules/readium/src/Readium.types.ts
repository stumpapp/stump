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
export type ColumnCount = 'auto' | 1 | 2
export type ImageFilter = 'darken' | 'invert'
export type TextAlignment = 'start' | 'left' | 'right' | 'center' | 'justify'

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
	target?: number | null
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
	onBookLoaded: (params: BookLoadedEventPayload) => void
	onLocatorChange: (params: ReadiumLocator) => void
	onMiddleTouch: () => void
	onSelection: (params: {
		cleared?: boolean
		x?: number
		y?: number
		locator?: ReadiumLocator
	}) => void
	onDoubleTouch: (params: ReadiumLocator) => void
	onReachedEnd: (params: ReadiumLocator) => void
	onError: (params: {
		errorDescription: string
		failureReason: string
		recoverySuggestion: string
	}) => void
}

export type ChangeEventPayload = {
	value: string
}

export type NativeTableOfContentsItem = {
	label: string
	content: string
	children: NativeTableOfContentsItem[]
	play_order: number
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

export type BookLoadedEventPayload = {
	success: boolean
	error?: string
	bookMetadata?: BookMetadata
	tableOfContents?: NativeTableOfContentsItem[]
}

export type EPUBReaderThemeConfig = {
	fontSize?: number
	fontFamily?: string
	lineHeight?: number
	brightness?: number
	colors?: {
		background: string
		foreground: string
		highlight: string
	}
}

/**
 * All available EPUB reader preferences that Readium supports.
 * Many of these require `publisherStyles` to be disabled to work
 */
export type EPUBReaderPreferences = {
	pageMargins?: number
	columnCount?: ColumnCount
	imageFilter?: ImageFilter
	verticalText?: boolean
	// All below require publisherStyles to be disabled
	textAlign?: TextAlignment
	typeScale?: number
	fontWeight?: number
	paragraphIndent?: number
	paragraphSpacing?: number
	wordSpacing?: number
	letterSpacing?: number
	hyphens?: boolean
	ligatures?: boolean
	textNormalization?: boolean
	/**
	 * Whether publisher styles should be observed
	 */
	publisherStyles?: boolean
}

export type EPUBReaderConfig = {
	readingMode?: ReadingMode
	readingDirection?: ReadingDirection
} & EPUBReaderThemeConfig &
	EPUBReaderPreferences

export type ReadiumViewProps = {
	bookId: string
	url: string
	locator?: ReadiumLocator
	initialLocator?: ReadiumLocator
	decorations?: Decoration[]
	onLoad?: (event: { nativeEvent: OnLoadEventPayload }) => void
	onBookLoaded?: (event: { nativeEvent: BookLoadedEventPayload }) => void
	onLayoutChange?: (event: { nativeEvent: { bookMetadata?: BookMetadata } }) => void
	onLocatorChange?: (event: { nativeEvent: ReadiumLocator }) => void
	onMiddleTouch?: (event: { nativeEvent: void }) => void
	onSelection?: (event: { nativeEvent: SelectionEvent }) => void
	onAnnotationTap?: (event: { nativeEvent: DecoratorTapEvent }) => void
	onHighlightRequest?: (event: { nativeEvent: HighlightRequestEvent }) => void
	onNoteRequest?: (event: { nativeEvent: NoteRequestEvent }) => void
	onEditHighlight?: (event: { nativeEvent: { decorationId: string } }) => void
	onDeleteHighlight?: (event: { nativeEvent: { decorationId: string } }) => void
	onDoubleTouch?: (event: { nativeEvent: ReadiumLocator }) => void
	onReachedEnd?: (event: { nativeEvent: ReadiumLocator }) => void
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

export interface Decoration {
	id: string // Note: I use nums but Readium requires strings
	bookId: string
	locator: ReadiumLocator
	color: string // Note: Added to support future where we can override color per annotation
	annotationText?: string
	createdAt: Date
	updatedAt: Date
}

export interface DecoratorTapEvent {
	decorationId: string
	rect?: { x: number; y: number; width: number; height: number }
}

export interface SelectionEvent {
	cleared?: boolean
	x?: number
	y?: number
	locator?: ReadiumLocator
}

export interface HighlightRequestEvent {
	locator: ReadiumLocator
	text: string
}

export interface NoteRequestEvent {
	locator: ReadiumLocator
	text: string
}

export type ReadiumViewRef = {
	goToLocation: (locator: ReadiumLocator) => Promise<void>
	goForward: () => Promise<void>
	goBackward: () => Promise<void>
	destroy: () => Promise<void>
	getSelection: () => Promise<SelectionEvent | null>
	clearSelection: () => Promise<void>
}
