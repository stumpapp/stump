import { createContext, useContext } from 'react'
import { FlatList } from 'react-native-gesture-handler'

export type ImageBasedBookRef = {
	id: string
	name: string
	pages: number
}

export type ImageBasedBookPageRef = {
	height: number
	width: number
	ratio: number
}

export type IImageBasedReaderContext = {
	flatListRef: React.RefObject<FlatList>
	book: ImageBasedBookRef
	imageSizes?: ImageBasedBookPageRef[]
	pageURL: (page: number) => string
	currentPage?: number
	onPageChanged?: (page: number) => void
}

export const ImageBasedReaderContext = createContext<IImageBasedReaderContext | null>(null)

export const useImageBasedReader = () => {
	const context = useContext(ImageBasedReaderContext)
	if (!context) {
		throw new Error('useImageBasedReader must be used within a ImageBasedReaderProvider')
	}
	return context
}
