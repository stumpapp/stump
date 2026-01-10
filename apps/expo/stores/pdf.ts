import { create } from 'zustand'

import { ReaderBookRef } from '~/components/book/reader/image/context'
import { PDFBookLoadedEvent, PDFViewRef } from '~/modules/readium'

export type IPdfStore = {
	book?: ReaderBookRef
	storeBook: (book: ReaderBookRef) => void
	actions?: PDFViewRef | null
	storeActions: (actions: PDFViewRef | null) => void

	currentPage: number
	setCurrentPage: (page: number) => void

	onLoaded: (event: PDFBookLoadedEvent) => void

	// TODO: TOC from Readium?

	resetStore: () => void
}

export const usePdfStore = create<IPdfStore>((set, get) => ({
	book: undefined,
	storeBook: (book) => set({ book }),
	actions: null,
	storeActions: (actions) => set({ actions }),

	currentPage: 0,
	setCurrentPage: (page) => set({ currentPage: page }),

	onLoaded: (event: PDFBookLoadedEvent) => {
		const existingBook = get().book
		if (!existingBook) return
		if (!existingBook.pages) {
			existingBook.pages = event.bookMetadata.totalPages
			set({ book: existingBook })
		}
	},

	resetStore: () => set({ book: undefined, actions: null, currentPage: 0 }),
}))
