import type { ReaderLocator } from '../context'

export type EpubAnnotation = {
	id: string
	mediaId: string
	userId: string
	annotationText?: string | null
	createdAt: string
	updatedAt: string
	locator: ReaderLocator
}

export type AnnotationSelection = {
	/** Viewport-relative bounding box for the floating toolbar. */
	rect: { x: number; y: number; width: number; height: number }
	/** Canonical locator ready for persistence / decoration. */
	locator: ReaderLocator
	/** Selected plain text. */
	text: string
}

export const ANNOTATION_DECORATION_GROUP = 'annotations'
export const DEFAULT_HIGHLIGHT_TINT = '#FACC15'
