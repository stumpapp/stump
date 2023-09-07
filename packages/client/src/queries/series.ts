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

export function usePagedSeriesQuery(options: PageQueryOptions<Series> = {}) {
	const { data, ...restReturn } = usePageQuery(
		[seriesQueryKeys.getSeries, options],
		async ({ page, page_size, params }) => {
			const { data } = await seriesApi.getSeries({ page, page_size, ...(params ?? {}) })
			return data
		},
		{
			keepPreviousData: true,
			...options,
		},
	)

	const series = data?.data
	const pageData = data?._page

	return {
		pageData,
		series,
		...restReturn,
	}
}

export function useSeriesCursorQuery({ queryKey, ...options }: CursorQueryOptions<Series>) {
	const { data, ...restReturn } = useCursorQuery(
		queryKey ?? [seriesQueryKeys.getSeriesWithCursor],
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

export function useUpNextInSeries(id: string, options: QueryOptions<Media | undefined> = {}) {
	const { data: media, ...restReturn } = useQuery(
		[seriesQueryKeys.getNextInSeries, id],
		() => seriesApi.getNextInSeries(id).then((res) => res.data),
		{
			...options,
			useErrorBoundary: false,
		},
	)

	return { ...restReturn, media }
}
