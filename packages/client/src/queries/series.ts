import { getNextInSeries, getRecentlyAddedSeries, getSeriesById, getSeriesMedia } from '@stump/api'
import type { Media, Series } from '@stump/types'
import { AxiosError } from 'axios'

import { queryClient, QueryOptions, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'
import { useQueryParamStore } from '../stores'
import { QueryCallbacks } from '.'

const SERIES_KEYS = QUERY_KEYS.series

export const prefetchSeries = async (id: string) => {
	await queryClient.prefetchQuery([SERIES_KEYS.getSeriesById, id], () => getSeriesById(id), {
		staleTime: 10 * 1000,
	})
}

export function useSeriesByIdQuery(id: string, params?: QueryOptions<Series, AxiosError>) {
	const { data, ...ret } = useQuery(
		[SERIES_KEYS.getSeriesById, id],
		() => getSeriesById(id).then(({ data }) => data),
		params,
	)

	return { series: data, ...ret }
}

export function useSeriesMedia(seriesId: string, page = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore((state) => state)

	const { isLoading, isFetching, isRefetching, isPreviousData, data } = useQuery(
		[SERIES_KEYS.getSeriesMedia, page, seriesId, paramsStore],
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
	// return useInfinitePagedQuery(
	// 	[SERIES_KEYS.getRecentlyAddedSeries],
	// 	getRecentlyAddedSeries,
	// 	new URLSearchParams('page_size=50'),
	// )
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
	} = useQuery(
		[SERIES_KEYS.getNextInSeries, id],
		() => getNextInSeries(id).then((res) => res.data),
		{
			...options,
			useErrorBoundary: false,
		},
	)

	return { isLoading: isLoading || isFetching || isRefetching, media }
}
