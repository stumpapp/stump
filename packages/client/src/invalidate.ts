import { jobQueryKeys, libraryQueryKeys, mediaQueryKeys, seriesQueryKeys } from '@stump/api'
import { CoreEvent } from '@stump/types'
import { QueryKey } from '@tanstack/react-query'

import { queryClient } from './client'

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

// TODO: this is still rather verbose, but it's a start
export const core_event_triggers = {
	CreateEntityFailed: {
		keys: [jobQueryKeys.getJobs],
	},
	CreatedMedia: {
		keys: [
			libraryQueryKeys.getLibraryById,
			libraryQueryKeys.getLibrariesStats,
			seriesQueryKeys.getSeriesById,
			mediaQueryKeys.getRecentlyAddedMedia,
		],
	},
	CreatedMediaBatch: {
		keys: [
			libraryQueryKeys.getLibraryById,
			libraryQueryKeys.getLibrariesStats,
			seriesQueryKeys.getSeriesById,
			mediaQueryKeys.getRecentlyAddedMedia,
			seriesQueryKeys.getRecentlyAddedSeries,
		],
	},
	CreatedSeries: {
		keys: [
			libraryQueryKeys.getLibraryById,
			libraryQueryKeys.getLibrariesStats,
			seriesQueryKeys.getSeriesById,
			seriesQueryKeys.getRecentlyAddedSeries,
			mediaQueryKeys.getRecentlyAddedMedia,
		],
	},
	CreatedSeriesBatch: {
		keys: [
			libraryQueryKeys.getLibraryById,
			libraryQueryKeys.getLibrariesStats,
			seriesQueryKeys.getSeriesById,
			mediaQueryKeys.getRecentlyAddedMedia,
			seriesQueryKeys.getRecentlyAddedSeries,
		],
	},
	GeneratedThumbnailBatch: {
		keys: [
			seriesQueryKeys.getSeriesById,
			mediaQueryKeys.getRecentlyAddedMedia,
			seriesQueryKeys.getRecentlyAddedSeries,
		],
	},
	JobComplete: {
		keys: [
			libraryQueryKeys.getLibraryById,
			libraryQueryKeys.getLibrariesStats,
			jobQueryKeys.getJobs,
			seriesQueryKeys.getSeriesById,
			seriesQueryKeys.getRecentlyAddedSeries,
			mediaQueryKeys.getRecentlyAddedMedia,
		],
	},
	JobFailed: {
		keys: [jobQueryKeys.getJobs],
	},
	JobProgress: {
		keys: [jobQueryKeys.getJobs],
	},
	JobStarted: {
		keys: [jobQueryKeys.getJobs],
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
