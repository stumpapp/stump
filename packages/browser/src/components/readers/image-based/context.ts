import { createContext, useContext } from 'react'

export type ImagePageDimensionRef = {
	height: number
	width: number
	isPortrait: boolean
}

export type IImageBaseReaderContext = {
	/**
	 * The dimensions of the pages in the book, as they are loaded
	 */
	pageDimensions: Record<number, ImagePageDimensionRef>
	/**
	 * A function to set the dimensions of a page
	 */
	setDimensions: React.Dispatch<React.SetStateAction<Record<number, ImagePageDimensionRef>>>
}

export const ImageBaseReaderContext = createContext<IImageBaseReaderContext | null>(null)

export const useImageBaseReaderContext = () => {
	const context = useContext(ImageBaseReaderContext)
	if (!context) {
		throw new Error('useImageBaseReaderContext must be used within a ImageBaseReaderContext')
	}
	return context
}
