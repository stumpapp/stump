import { Library } from '@stump/types'
import { createContext, useContext } from 'react'

export type ILibraryContext = {
	library: Library
}
export const LibraryContext = createContext<ILibraryContext | null>(null)
export const useLibraryContext = () => {
	const context = useContext(LibraryContext)
	if (!context) {
		throw new Error('useLibraryContext must be used within a LibraryContext.Provider')
	}
	return context
}
