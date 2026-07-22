import { createContext, useContext } from 'react'

import { ReadiumLocator, ReadiumViewRef, TTSPlaybackState } from '~/modules/readium'
import { Timer } from '~/stores/reader'

export type EpubReaderContextValue = {
	readerRef: ReadiumViewRef | null
	timer: Timer
	getRequestHeaders?: () => Record<string, string>
	onBookmark?: (locator: ReadiumLocator, previewContent?: string) => Promise<{ id: string } | void>
	onDeleteBookmark?: (bookmarkId: string) => Promise<void>
	onCreateAnnotation?: (locator: ReadiumLocator, annotationText?: string) => Promise<{ id: string }>
	onUpdateAnnotation?: (annotationId: string, annotationText: string | null) => Promise<void>
	onDeleteAnnotation?: (annotationId: string) => Promise<void>
	// TODO: it was quickest for me to add here, however will churn thru lots of updates so perhaps dedicated store
	// is better
	ttsState: TTSPlaybackState
	supportsTTS: boolean
}

export const EpubReaderContext = createContext<EpubReaderContextValue | null>(null)

export const useEpubReaderContext = () => {
	const context = useContext(EpubReaderContext)
	if (!context) {
		throw new Error('useEpubReaderContext must be used within an EpubReaderProvider')
	}
	return context
}
