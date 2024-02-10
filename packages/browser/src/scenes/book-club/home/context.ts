import { BookClub, BookClubMember } from '@stump/types'
import { createContext, useContext } from 'react'

export type IBookClubContext = {
	bookClub: BookClub
	viewerMember?: BookClubMember
	viewerIsMember: boolean
	viewerCanManage: boolean
}
export const BookClubContext = createContext<IBookClubContext>({
	bookClub: {} as BookClub,
	viewerCanManage: false,
	viewerIsMember: false,
})
export const useBookClubContext = () => useContext(BookClubContext)
