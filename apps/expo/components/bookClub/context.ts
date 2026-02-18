import { BookClubMemberRole } from '@stump/graphql'
import { createContext, useContext } from 'react'

export type IBookClubContext = {
	clubId: string
	viewerMembership?: {
		id: string
		role: BookClubMemberRole
	} | null
}

export const BookClubContext = createContext<IBookClubContext | null>(null)

const roleHierarchy: Record<BookClubMemberRole, number> = {
	[BookClubMemberRole.Member]: 0,
	[BookClubMemberRole.Moderator]: 1,
	[BookClubMemberRole.Admin]: 2,
	[BookClubMemberRole.Creator]: 3,
}

export const useBookClubContext = () => {
	const context = useContext(BookClubContext)
	if (!context) {
		throw new Error('useBookClubContext must be used within a BookClubContext.Provider')
	}

	const checkRole = (minRole: BookClubMemberRole) => {
		if (!context.viewerMembership) return false
		return roleHierarchy[context.viewerMembership.role] >= roleHierarchy[minRole]
	}

	return {
		...context,
		checkRole,
	}
}
