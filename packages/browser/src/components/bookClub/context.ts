import { BookClubLayoutQuery } from '@stump/graphql'
import { createContext, useContext } from 'react'

export type IBookClubContext = {
	bookClub: NonNullable<BookClubLayoutQuery['bookClubBySlug']>
	viewerIsMember: boolean
	viewerCanManage: boolean
}

/**
 * A context to manage the state while viewing a specific book club
 */
export const BookClubContext = createContext<IBookClubContext | undefined>(undefined)

/**
 * A hook to access the book club context. This will throw an error if the hook is used
 * outside of the context provider.
 */
export const useBookClubContext = () => {
	const context = useContext(BookClubContext)

	if (!context) {
		throw new Error('useBookClubContext must be used within a BookClubProvider')
	}

	return context
}

/**
 * A safe alternative to {@link useBookClubContext} that will not throw an error if the hook is used
 * outside of the context provider. This is primarily used to support form components being aware of
 * editing vs creating state
 */
export const useBookClubContextSafe = () => useContext(BookClubContext)
