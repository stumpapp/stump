import { CoreEvent } from '@stump/types'
import { QueryKey } from '@tanstack/react-query'

import { queryClient } from './index'
import { QUERY_KEYS } from './query_keys'

type CoreEventTrigger = CoreEvent['key']
type InvalidateFnArgs = {
	exact?: boolean
} & (
	| {
			keys: string[]
	  }
	| {
			queryKey: QueryKey
	  }
)

const { library, series, media, job } = QUERY_KEYS

// TODO: this is still rather verbose, but it's a start
export const core_event_triggers = {
	CreateEntityFailed: {
		keys: [job.get],
	},
	CreatedMedia: {
		keys: [library.get_by_id, library.stats, series.get, media.recently_added],
	},
	CreatedMediaBatch: {
		keys: [library.get_by_id, library.stats, series.get, media.recently_added],
	},
	CreatedSeries: {
		keys: [library.get_by_id, library.stats, series.get, media.recently_added],
	},
	CreatedSeriesBatch: {
		keys: [library.get_by_id, library.stats, series.get, media.recently_added],
	},
	JobComplete: {
		keys: [
			library.get_by_id,
			library.stats,
			job.get,
			series.get,
			series.recently_added,
			media.recently_added,
		],
	},
	JobFailed: {
		keys: [job.get],
	},
	JobProgress: {
		keys: [job.get],
	},
	JobStarted: {
		keys: [job.get],
	},
} satisfies Record<CoreEventTrigger, InvalidateFnArgs>

export async function invalidateQueries({ exact, ...args }: InvalidateFnArgs) {
	if ('keys' in args) {
		const predicate = (query: { queryKey: QueryKey }, compare: string) => {
			const key = (query.queryKey[0] as string) || ''
			return exact ? key === compare : key.startsWith(compare)
		}
		return Promise.all(
			args.keys.map((key) =>
				queryClient.invalidateQueries({
					predicate: (query) => predicate(query, key),
				}),
			),
		)
	} else {
		return queryClient.invalidateQueries({ exact, queryKey: args.queryKey })
	}
}
