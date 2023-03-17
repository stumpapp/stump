import { getNextInSeries, getRecentlyAddedSeries, getSeriesById, getSeriesMedia } from '@stump/api'
import type { Media, Series } from '@stump/types'
import { Axios, isAxiosError } from 'axios'

import { queryClient, useInfinitePagedQuery, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'
import { useQueryParamStore } from '../stores'
import { QueryCallbacks } from '.'

const SERIES_KEYS = QUERY_KEYS.series

export const prefetchSeries = async (id: string) => {
	await queryClient.prefetchQuery([SERIES_KEYS.get_by_id, id], () => getSeriesById(id), {
		staleTime: 10 * 1000,
	})
}

export function useSeries(id: string, options: QueryCallbacks<Series> = {}) {
	const {
		isLoading,
		isFetching,
		isRefetching,
		data: series,
	} = useQuery(
		[SERIES_KEYS.get_by_id, id],
		() => getSeriesById(id).then(({ data }) => data),
		options,
	)

	return { isLoading: isLoading || isFetching || isRefetching, series }
}

export function useSeriesMedia(seriesId: string, page = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore((state) => state)

	const { isLoading, isFetching, isRefetching, isPreviousData, data } = useQuery(
		[SERIES_KEYS.media, page, seriesId, paramsStore],
		() =>
			getSeriesMedia(seriesId, page, getQueryString()).then(({ data }) => ({
				media: data.data,
				pageData: data._page,
			})),
		{
			// context: StumpQueryContext,
			keepPreviousData: true,
		},
	)

	const { media, pageData } = data ?? {}

	return {
		isLoading: isLoading || isFetching || isRefetching,
		isPreviousData,
		media,
		pageData,
	}
}

export function useRecentlyAddedSeries() {
	return useInfinitePagedQuery(
		[SERIES_KEYS.recently_added],
		getRecentlyAddedSeries,
		new URLSearchParams('page_size=50'),
	)
}

// export function useInfinite() {
// 	const {
// 		status,
// 		data: pageData,
// 		error,
// 		isFetching,
// 		isFetchingNextPage,
// 		fetchNextPage,
// 		hasNextPage,
// 	} = useInfiniteQuery(
// 		['getRecentlyAddedSeries'],
// 		(ctx) => getRecentlyAddedSeries(ctx.pageParam, new URLSearchParams('page_size=50')),
// 		{
// 			getNextPageParam: (_lastGroup, groups) => groups.length,
// 		},
// 	);

// 	const data = pageData ? pageData.pages.flatMap((res) => res.data.data) : [];

// 	return {
// 		data,
// 	};
// }

export function useUpNextInSeries(id: string, options: QueryCallbacks<Media> = {}) {
	const {
		data: media,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery([SERIES_KEYS.up_next, id], () => getNextInSeries(id).then((res) => res.data), {
		...options,
		useErrorBoundary: false,
	})

	return { isLoading: isLoading || isFetching || isRefetching, media }
}
