import { BookReaderSceneQuery } from '@stump/graphql'
import { createContext, useContext } from 'react'

export type ImageReaderBookRef = NonNullable<BookReaderSceneQuery['mediaById']>

export type ImagePageDimensionRef = {
	height: number
	width: number
	ratio: number
}

// TODO: I think we can move this and useImageSizes to the client package so we can
// introduce better code sharing between platforms.

export type IImageBaseReaderContext = {
	/**
	 * The media entity associated with the reader
	 */
	book: ImageReaderBookRef
	/**
	 * The current page of the reader
	 */
	currentPage: number
	/**
	 * A function to set the current page
	 */
	setCurrentPage: (page: number) => void
	/**
	 * A function to get the URL of a specific page
	 */
	getPageUrl: (page: number) => string
	/**
	 * The sizes of the pages in the book, as they are loaded
	 */
	imageSizes: Record<number, ImagePageDimensionRef>
	/**
	 * A function to set the sizes of a page
	 */
	setPageSize: (page: number, dimensions: ImagePageDimensionRef) => void
	/**
	 * The page sets for the book
	 */
	pageSets: number[][]
	/**
	 * A function to reset the read timer
	 */
	resetTimer: () => void

	toggleToolbar: () => void
}

export const ImageBaseReaderContext = createContext<IImageBaseReaderContext | null>(null)

export const useImageBaseReaderContext = () => {
	const context = useContext(ImageBaseReaderContext)
	if (!context) {
		throw new Error('useImageBaseReaderContext must be used within a ImageBaseReaderContext')
	}
	return context
}
