import { BookClubMemberRole, User } from '@stump/graphql'

export type GraphQLError = {
	message: string
	locations: Array<{
		line: number
		column: number
	}>
	path?: Array<string | number>
	extensions?: Record<string, unknown>
}

export type GraphQLResponse<T> = {
	data: T
	errors?: Array<GraphQLError>
}

export type AuthUser = Omit<User, 'continueReading'>

export type BookClubMemberRoleSpec = Record<BookClubMemberRole, string>
