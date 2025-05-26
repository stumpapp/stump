import { LibraryLayoutQuery } from '@stump/graphql'
import { createContext, useContext } from 'react'

// TODO: add derived meta (book_count, series_count, etc)
export type ILibraryContext = {
	library: NonNullable<LibraryLayoutQuery['libraryById']>
}
/**
 * A context to hold the state while navigating any library-related pages.
 */
export const LibraryContext = createContext<ILibraryContext | null>(null)
/**
 * A hook to access the library context. This will throw an error if the hook is used
 * outside of the context provider.
 */
export const useLibraryContext = () => {
	const context = useContext(LibraryContext)
	if (!context) {
		throw new Error('useLibraryContext must be used within a LibraryContext.Provider')
	}
	return context
}
/**
 * A variant of the {@link useLibraryContext} hook which will not throw an error if the hook is used
 * outside of the context provider. This is primarily used throughout the create/update form components
 * to determine if a library is being updated or created.
 */
export const useLibraryContextSafe = () => useContext(LibraryContext)
