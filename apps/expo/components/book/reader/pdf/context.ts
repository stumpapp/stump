import { createContext, useContext } from 'react'

import { Timer } from '~/stores/reader'

export type IPdfReaderContext = {
	serverId: string
	timer: Timer
}

export const PdfReaderContext = createContext<IPdfReaderContext | null>(null)

export const usePdfReaderContext = () => {
	const context = useContext(PdfReaderContext)
	if (!context) {
		throw new Error('usePdfReaderContext must be used within a PdfReaderProvider')
	}
	return context
}
