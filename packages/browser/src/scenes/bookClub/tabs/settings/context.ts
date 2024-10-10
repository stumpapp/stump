import { UpdateBookClub } from '@stump/sdk'
import { createContext, useContext } from 'react'

import { useBookClubContext } from '@/components/bookClub'

export type IBookClubManagementContext = {
	/**
	 * A function that issues a PATCH update to the library.
	 */
	patch: (updates: Partial<UpdateBookClub>) => void
}

export const BookClubManagementContext = createContext<IBookClubManagementContext | null>(null)

export const useBookClubManagement = () => {
	const clubCtx = useBookClubContext()
	const managementCtx = useContext(BookClubManagementContext)

	if (!managementCtx) {
		throw new Error('useBookClubManagement must be used within a BookClubManagementContext')
	}

	return {
		club: clubCtx.bookClub,
		...managementCtx,
	}
}
