import { bookClubApi, bookClubQueryKeys } from '@stump/api'
import { BookClub, GetBookClubsParams } from '@stump/types'

import { QueryOptions, useQuery } from '../client'

type UseBookClubsQueryOptions = QueryOptions<BookClub[]> & {
	params?: GetBookClubsParams
}
export function useBookClubsQuery({ params, ...options }: UseBookClubsQueryOptions = {}) {
	const { data, ...rest } = useQuery(
		[bookClubQueryKeys.getBookClubs],
		() => bookClubApi.getBookClubs(params).then((res) => res.data),
		options,
	)

	return { bookClubs: data, ...rest }
}

export function useBookClubQuery(id: string, options: QueryOptions<BookClub> = {}) {
	const { data, ...rest } = useQuery(
		[bookClubQueryKeys.getBookClubById, id],
		() => bookClubApi.getBookClubById(id).then((res) => res.data),
		options,
	)

	return { bookClub: data, ...rest }
}
