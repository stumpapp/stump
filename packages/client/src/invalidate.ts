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
			exact?: false
	  }
	| {
			queryKey: QueryKey
			exact?: boolean
	  }
)

// FIXME: I hate this... Figure out a better way to do this

export const core_event_triggers = {
	CreateEntityFailed: {
		keys: [jobQueryKeys.getJobs],
	},
	// This results in WAY too many re-queries...
	CreateOrUpdateMedia: {
		keys: [
			// libraryQueryKeys.getLibraryById,
			// libraryQueryKeys.getLibrariesStats,
			// seriesQueryKeys.getSeriesById,
			// mediaQueryKeys.getRecentlyAddedMedia,
		],
	},
	CreatedManyMedia: {
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
			mediaQueryKeys.getInProgressMedia,
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
	SeriesScanComplete: {
		keys: [
			libraryQueryKeys.getLibrarySeries,
			seriesQueryKeys.getSeries,
			libraryQueryKeys.getLibraryById,
			libraryQueryKeys.getLibrariesStats,
			seriesQueryKeys.getSeriesById,
			mediaQueryKeys.getRecentlyAddedMedia,
			seriesQueryKeys.getRecentlyAddedSeries,
			mediaQueryKeys.getInProgressMedia,
		],
	},
} satisfies Record<CoreEventTrigger, InvalidateFnArgs>

export async function invalidateQueries({ exact, ...args }: InvalidateFnArgs) {
	if ('keys' in args) {
		const predicate = ({ queryKey }: { queryKey: QueryKey }, compare: string) =>
			queryKey.includes(compare)

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
