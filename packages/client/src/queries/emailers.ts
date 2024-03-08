import { emailerApi, emailerQueryKeys } from '@stump/api'
import { SMTPEmailer } from '@stump/types'

import { QueryOptions, useQuery } from '../client'

export function useEmailersQuery(options: QueryOptions<SMTPEmailer[]> = {}) {
	const { data: emailers, ...restReturn } = useQuery(
		[emailerQueryKeys.getEmailers],
		async () => {
			const { data } = await emailerApi.getEmailers()
			return data
		},
		options,
	)

	return {
		emailers,
		...restReturn,
	}
}
