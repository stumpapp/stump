import { QueryKey } from '@tanstack/react-query'

import { queryClient } from './client'

type InvalidateFnArgs = {
	exact?: boolean
} & (
	| {
			keys: string[]
			exact?: false
	  }
	| {
			queryKey: QueryKey
			exact?: boolean
	  }
)

export async function invalidateQueries({ exact, ...args }: InvalidateFnArgs) {
	if ('keys' in args) {
		const predicate = (queryKey: QueryKey, compare: string) =>
			queryKey.some((piece) => typeof piece === 'string' && piece.includes(compare))

		return Promise.all(
			args.keys.map((key) =>
				queryClient.invalidateQueries({
					predicate: (query) => predicate(query.queryKey, key),
				}),
			),
		)
	} else {
		return queryClient.invalidateQueries({ exact, queryKey: args.queryKey })
	}
}
