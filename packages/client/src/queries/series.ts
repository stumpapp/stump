import { seriesApi, seriesQueryKeys } from '@stump/api'
import type { Media, Series } from '@stump/types'
import { AxiosError } from 'axios'

import {
	CursorQueryOptions,
	PageQueryOptions,
	queryClient,
	QueryOptions,
	useCursorQuery,
	usePageQuery,
	useQuery,
} from '../client'
import { QueryCallbacks } from '.'

export const prefetchSeries = async (id: string) => {
	await queryClient.prefetchQuery(
		[seriesQueryKeys.getSeriesById, id],
		() => seriesApi.getSeriesById(id),
		{
			staleTime: 10 * 1000,
		},
	)
}

export function useSeriesByIdQuery(id: string, params?: QueryOptions<Series, AxiosError>) {
	const { data, ...ret } = useQuery(
		[seriesQueryKeys.getSeriesById, id],
		() => seriesApi.getSeriesById(id).then(({ data }) => data),
		params,
	)

	return { series: data, ...ret }
}

export function useSeriesCursorQuery(options: CursorQueryOptions<Series>) {
	const { data, ...restReturn } = useCursorQuery(
		[seriesQueryKeys.getSeriesWithCursor],
		async (params) => {
			const { data } = await seriesApi.getSeriesWithCursor(params)
			return data
		},
		options,
	)

	const series = data ? data.pages.flatMap((page) => page.data) : []

	return {
		data,
		series,
		...restReturn,
	}
}

export function useSeriesMediaQuery(seriesId: string, options: PageQueryOptions<Media>) {
	const { data, isLoading, isFetching, isRefetching, ...restReturn } = usePageQuery(
		[seriesQueryKeys.getSeriesMedia, seriesId],
		async ({ page = 1, ...rest }) => {
			const { data } = await seriesApi.getSeriesMedia(seriesId, { page, ...rest })
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
	// 	[seriesQueryKeys.getRecentlyAddedSeries],
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
		[seriesQueryKeys.getNextInSeries, id],
		() => seriesApi.getNextInSeries(id).then((res) => res.data),
		{
			...options,
			useErrorBoundary: false,
		},
	)

	return { isLoading: isLoading || isFetching || isRefetching, media }
}
