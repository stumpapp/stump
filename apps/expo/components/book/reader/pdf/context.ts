import { createContext, useContext } from 'react'

export type IPdfReaderContext = {
	serverId: string
	resetTimer?: () => void
}

export const PdfReaderContext = createContext<IPdfReaderContext | null>(null)

export const usePdfReaderContext = () => {
	const context = useContext(PdfReaderContext)
	if (!context) {
		throw new Error('usePdfReaderContext must be used within a PdfReaderProvider')
	}
	return context
}
