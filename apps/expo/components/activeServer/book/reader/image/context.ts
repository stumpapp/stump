import { createContext, useContext } from 'react'

export type ImageBasedBookRef = {
	id: string
	name: string
	pages: number
}

export type IImageBasedReaderContext = {
	book: ImageBasedBookRef
	pageURL: (page: number) => string
}

export const ImageBasedReaderContext = createContext<IImageBasedReaderContext | null>(null)

export const useImageBasedReader = () => {
	const context = useContext(ImageBasedReaderContext)
	if (!context) {
		throw new Error('useImageBasedReader must be used within a ImageBasedReaderProvider')
	}
	return context
}
