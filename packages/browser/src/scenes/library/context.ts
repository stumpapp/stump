import { Library, LibraryStats } from '@stump/types'
import { createContext, useContext } from 'react'

// TODO: add derived meta (book_count, series_count, etc)
export type ILibraryContext = {
	library: Library
	stats?: LibraryStats
}
export const LibraryContext = createContext<ILibraryContext | null>(null)
export const useLibraryContext = () => {
	const context = useContext(LibraryContext)
	if (!context) {
		throw new Error('useLibraryContext must be used within a LibraryContext.Provider')
	}
	return context
}
