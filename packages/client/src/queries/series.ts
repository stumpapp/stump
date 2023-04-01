import { getNextInSeries, getSeriesById, getSeriesMedia } from '@stump/api'
import type { Media, Series } from '@stump/types'
import { AxiosError } from 'axios'

import { PageQueryOptions, queryClient, QueryOptions, usePageQuery, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'
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

export function useSeriesMediaQuery(seriesId: string, options: PageQueryOptions<Media>) {
	const { data, isLoading, isFetching, isRefetching, ...restReturn } = usePageQuery(
		[SERIES_KEYS.getSeriesMedia, seriesId],
		async ({ page = 1 }) => {
			const { data } = await getSeriesMedia(seriesId, page)
			return data
		},
		{
			...options,
			keepPreviousData: true,
		},
	)

	const media = data?.data
	const pageData = data?._page

	return {
		isLoading: isLoading || isFetching || isRefetching,
		media,
		pageData,
		...restReturn,
	}
}

export function useRecentlyAddedSeries() {
	// return useInfinitePagedQuery(
	// 	[SERIES_KEYS.getRecentlyAddedSeries],
	// 	getRecentlyAddedSeries,
	// 	new URLSearchParams('page_size=50'),
	// )
}

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
