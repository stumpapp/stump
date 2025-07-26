import { createContext, useContext } from 'react'
import { FlatList } from 'react-native'

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
	// flatListRef: React.RefObject<FlashList<number>>
	book: ImageBasedBookRef
	imageSizes?: Record<number, ImageBasedBookPageRef>
	setImageSizes: React.Dispatch<React.SetStateAction<Record<number, ImageBasedBookPageRef>>>
	pageSets: number[][]
	pageURL: (page: number) => string
	pageThumbnailURL?: (page: number) => string
	currentPage?: number
	onPageChanged?: (page: number) => void
	resetTimer?: () => void
}

export const ImageBasedReaderContext = createContext<IImageBasedReaderContext | null>(null)

export const useImageBasedReader = () => {
	const context = useContext(ImageBasedReaderContext)
	if (!context) {
		throw new Error('useImageBasedReader must be used within a ImageBasedReaderProvider')
	}
	return context
}
