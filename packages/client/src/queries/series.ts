import { getNextInSeries, getRecentlyAddedSeries, getSeriesById, getSeriesMedia } from '@stump/api'
import type { Media, Pageable, Series } from '@stump/types'

import { queryClient, useInfinitePagedQuery, useQuery } from '../client'
import { useQueryParamStore } from '../stores'
import { QueryCallbacks } from '.'

export const prefetchSeries = async (id: string) => {
	await queryClient.prefetchQuery(['getSeries', id], () => getSeriesById(id), {
		staleTime: 10 * 1000,
	})
}

export function useSeries(id: string, options: QueryCallbacks<Series> = {}) {
	const {
		isLoading,
		isFetching,
		isRefetching,
		data: series,
	} = useQuery(['getSeries'], () => getSeriesById(id).then((res) => res.data), options)

	return { isLoading: isLoading || isFetching || isRefetching, series }
}

export function useSeriesMedia(seriesId: string, page = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore((state) => state)

	const { isLoading, isFetching, isRefetching, isPreviousData, data } = useQuery(
		['getSeriesMedia', page, seriesId, paramsStore],
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
		['getRecentlyAddedSeries'],
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
	} = useQuery(['getNextInSeries', id], () => getNextInSeries(id).then((res) => res.data), options)

	return { isLoading: isLoading || isFetching || isRefetching, media }
}
