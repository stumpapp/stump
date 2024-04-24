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
import { prefetchSeriesMedia } from './media'

type PrefetchSeriesOptions = {
	prefetchBooks?: boolean
}
export const prefetchSeries = async (
	id: string,
	{ prefetchBooks = true }: PrefetchSeriesOptions = {},
) => {
	const seriesPromise = queryClient.prefetchQuery(
		[seriesQueryKeys.getSeriesById, id],
		async () => {
			const { data } = await seriesApi.getSeriesById(id)
			return data
		},
		{
			staleTime: 10 * 1000,
		},
	)

	if (prefetchBooks) {
		await Promise.all([seriesPromise, prefetchSeriesMedia(id)])
	} else {
		await seriesPromise
	}
}

export const prefetchLibrarySeries = (id: string) =>
	queryClient.prefetchQuery(
		[
			seriesQueryKeys.getSeries,
			{ page: 1, page_size: 20, params: { count_media: true, library_id: id } },
		],
		async () => {
			const { data } = await seriesApi.getSeries({
				count_media: true,
				library_id: id,
				page: 1,
				page_size: 20,
			})
			return data
		},
		{
			staleTime: 10 * 1000,
		},
	)

type SeriesByIdOptions = {
	params?: Record<string, unknown>
} & QueryOptions<Series, AxiosError>
export function useSeriesByIdQuery(id: string, { params, ...options }: SeriesByIdOptions = {}) {
	const { data, ...ret } = useQuery(
		[seriesQueryKeys.getSeriesById, id, params],
		() => seriesApi.getSeriesById(id, params).then(({ data }) => data),
		options,
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

export const prefetchPagedSeries = (options: PageQueryOptions<Series>) =>
	queryClient.prefetchQuery([seriesQueryKeys.getSeries, options], () =>
		seriesApi.getSeries(options),
	)

// TODO: fix this query!
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
