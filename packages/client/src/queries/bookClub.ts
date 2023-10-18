import { bookClubApi, bookClubQueryKeys } from '@stump/api'
import { BookClub } from '@stump/types'

import { QueryOptions, useQuery } from '../client'

export function useBookClubsQuery(options: QueryOptions<BookClub[]> = {}) {
	const { data, ...rest } = useQuery(
		[bookClubQueryKeys.getBookClubs],
		() => bookClubApi.getBookClubs().then((res) => res.data),
		options,
	)

	return { bookClubs: data, ...rest }
}
