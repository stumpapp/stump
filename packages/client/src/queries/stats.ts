import { statsApi, statsQueryKeys } from '@stump/api'

import { useQuery } from '../client'

export function useCompletedBooksStatsQuery() {
	return useQuery(
		[statsQueryKeys.getCompletedBooksStats],
		async () => {
			const { data } = await statsApi.getCompletedBooksStats()
			return data
		},
		{
			suspense: true,
		},
	)
}
