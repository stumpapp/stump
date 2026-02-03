import { createContext, useContext } from 'react'

import { ReadiumLocator, ReadiumViewRef } from '~/modules/readium'

export type EpubReaderContextValue = {
	readerRef: ReadiumViewRef | null
	getRequestHeaders?: () => Record<string, string>
	onBookmark?: (locator: ReadiumLocator, previewContent?: string) => Promise<{ id: string } | void>
	onDeleteBookmark?: (bookmarkId: string) => Promise<void>
	onCreateAnnotation?: (locator: ReadiumLocator, annotationText?: string) => Promise<{ id: string }>
	onUpdateAnnotation?: (annotationId: string, annotationText: string | null) => Promise<void>
	onDeleteAnnotation?: (annotationId: string) => Promise<void>
}

export const EpubReaderContext = createContext<EpubReaderContextValue | null>(null)

export const useEpubReaderContext = () => {
	const context = useContext(EpubReaderContext)
	if (!context) {
		throw new Error('useEpubReaderContext must be used within an EpubReaderProvider')
	}
	return context
}
