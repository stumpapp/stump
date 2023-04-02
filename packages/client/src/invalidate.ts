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
		keys: [job.getJobs],
	},
	CreatedMedia: {
		keys: [
			library.getLibraryById,
			library.getLibrariesStats,
			series.getSeriesById,
			media.getRecentlyAddedMedia,
		],
	},
	CreatedMediaBatch: {
		keys: [
			library.getLibraryById,
			library.getLibrariesStats,
			series.getSeriesById,
			media.getRecentlyAddedMedia,
		],
	},
	CreatedSeries: {
		keys: [
			library.getLibraryById,
			library.getLibrariesStats,
			series.getSeriesById,
			media.getRecentlyAddedMedia,
		],
	},
	CreatedSeriesBatch: {
		keys: [
			library.getLibraryById,
			library.getLibrariesStats,
			series.getSeriesById,
			media.getRecentlyAddedMedia,
		],
	},
	JobComplete: {
		keys: [
			library.getLibraryById,
			library.getLibrariesStats,
			job.getJobs,
			series.getSeriesById,
			series.getRecentlyAddedSeries,
			media.getRecentlyAddedMedia,
		],
	},
	JobFailed: {
		keys: [job.getJobs],
	},
	JobProgress: {
		keys: [job.getJobs],
	},
	JobStarted: {
		keys: [job.getJobs],
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
