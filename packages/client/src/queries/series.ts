import type { Media, Series, SeriesFilter } from '@stump/types'
import { AxiosError } from 'axios'
import { useCallback } from 'react'

import { useSDK } from '@/sdk'

import {
	CursorQueryOptions,
	PageQueryOptions,
	queryClient,
	QueryOptions,
	TypedPageQueryOptions,
	useCursorQuery,
	usePageQuery,
	useQuery,
} from '../client'
import { usePrefetchSeriesBooks } from './media'

type PrefetchSeriesOptions = {
	id: string
	fetchBooks?: boolean
}

export const usePrefetchSeries = ({ id, fetchBooks = true }: PrefetchSeriesOptions) => {
	const { sdk } = useSDK()

	const { prefetch: prefetchBooks } = usePrefetchSeriesBooks({ id })

	const prefetchSeries = useCallback(
		() =>
			queryClient.prefetchQuery([sdk.series.keys.getByID, id], async () => sdk.series.getByID(id), {
				staleTime: 10 * 1000,
			}),
		[sdk.series, id],
	)

	const prefetch = useCallback(async () => {
		if (fetchBooks) {
			await Promise.all([prefetchSeries(), prefetchBooks()])
		} else {
			await prefetchSeries()
		}
	}, [fetchBooks, prefetchBooks, prefetchSeries])

	return { prefetch }
}

export const usePrefetchLibrarySeries = ({ id }: { id: string }) => {
	const { sdk } = useSDK()

	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery(
				[
					sdk.series.keys.get,
					1,
					20,
					{
						library: {
							id: [id],
						},
					} satisfies SeriesFilter,
				],
				() =>
					sdk.series.get({
						library: {
							id: [id],
						},
						page: 1,
						page_size: 20,
					}),
				{
					staleTime: 10 * 1000,
				},
			),
		[sdk.series, id],
	)

	return { prefetch }
}

type SeriesByIdOptions = {
	params?: SeriesFilter
} & QueryOptions<Series, AxiosError>
export function useSeriesByIdQuery(id: string, { params, ...options }: SeriesByIdOptions = {}) {
	const { sdk } = useSDK()
	const { data, ...ret } = useQuery(
		[sdk.series.keys.getByID, id, params],
		() => sdk.series.getByID(id, params),
		options,
	)

	return { series: data, ...ret }
}

export function usePagedSeriesQuery(options: PageQueryOptions<Series> = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = usePageQuery(
		[sdk.series.keys.get, options],
		async ({ page, page_size, params }) => sdk.series.get({ page, page_size, ...(params ?? {}) }),
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

export const usePrefetchPagedSeries = () => {
	const { sdk } = useSDK()
	const prefetch = useCallback(
		({
			page = 1,
			page_size = 20,
			params,
			...options
		}: TypedPageQueryOptions<Series, SeriesFilter>) =>
			queryClient.prefetchQuery(
				[sdk.series.keys.get, params],
				() =>
					sdk.series.get({
						page,
						page_size,
						...params,
					}),
				options,
			),
		[sdk.series],
	)
	return { prefetch }
}

export function useSeriesCursorQuery({ queryKey, ...options }: CursorQueryOptions<Series>) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = useCursorQuery(
		queryKey ?? [sdk.series.keys.getCursor],
		(params) => sdk.series.getCursor(params),
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
	const { sdk } = useSDK()
	const { data: media, ...restReturn } = useQuery(
		[sdk.series.keys.nextBook, id],
		() => sdk.series.nextBook(id),
		{
			...options,
			useErrorBoundary: false,
		},
	)

	return { ...restReturn, media }
}
