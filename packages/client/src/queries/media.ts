import { QueryOrderParams } from '@stump/sdk'
import type { Media, MediaFilter, ProgressUpdateReturn } from '@stump/types'
import { AxiosError } from 'axios'
import { useCallback } from 'react'

import { useSDK } from '@/sdk'

import {
	type CursorQueryOptions,
	MutationOptions,
	PageQueryOptions,
	type QueryOptions,
	TypedPageQueryOptions,
	useCursorQuery,
	useMutation,
	usePageQuery,
} from '../client'
import { queryClient, useQuery } from '../client'

export const usePrefetchMediaByID = (id: string) => {
	const { sdk } = useSDK()
	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery([sdk.media.keys.getByID, id], async () => sdk.media.getByID(id), {
				staleTime: 10 * 1000,
			}),
		[sdk.media, id],
	)
	return { prefetch }
}

export const usePrefetchLibraryBooks = (libraryID: string) => {
	const { sdk } = useSDK()

	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery(
				[
					sdk.media.keys.get,
					1,
					20,
					{
						series: {
							library: {
								id: [libraryID],
							},
						},
					} satisfies MediaFilter,
				],
				() =>
					sdk.media.get({
						page: 1,
						page_size: 20,
						series: {
							library: {
								id: [libraryID],
							},
						},
					}),
			),
		[sdk.media, libraryID],
	)

	return { prefetch }
}

export const usePrefetchSeriesBooks = (id: string) => {
	const { sdk } = useSDK()

	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery(
				[
					sdk.media.keys.get,
					1,
					20,
					{
						series: {
							id: [id],
						},
					} satisfies MediaFilter,
				],
				() =>
					sdk.media.get({
						page: 1,
						page_size: 20,
						series: {
							id: [id],
						},
					}),
			),
		[sdk.media, id],
	)

	return { prefetch }
}

type MediaQueryParams<TQueryFnData, TData = TQueryFnData> = QueryOptions<
	TQueryFnData,
	AxiosError,
	TData
>

type UseMediaByIdQueryOptions = MediaQueryParams<Media> & {
	params?: MediaFilter
}

export function useMediaByIdQuery(
	id: string,
	{ params, ...options }: UseMediaByIdQueryOptions = {},
) {
	const { sdk } = useSDK()
	const { data, ...ret } = useQuery(
		[sdk.media.keys.getByID, id, params],
		async () => sdk.media.getByID(id, params),
		{
			keepPreviousData: false,
			...options,
		},
	)

	return { media: data, ...ret }
}

type UsePagedMediaQueryParams = Omit<PageQueryOptions<Media>, 'params'> & {
	params?: MediaFilter & QueryOrderParams
}

export function usePagedMediaQuery(options: UsePagedMediaQueryParams = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = usePageQuery(
		[sdk.media.keys.get],
		async ({ page, page_size, params }) => sdk.media.get({ page, page_size, ...params }),
		{
			keepPreviousData: true,
			...options,
		},
	)

	const media = data?.data
	const pageData = data?._page

	return {
		media,
		pageData,
		...restReturn,
	}
}

export const usePrefetchMediaPaged = ({
	params,
	page = 1,
	page_size = 20,
	...options
}: TypedPageQueryOptions<Media, MediaFilter>) => {
	const { sdk } = useSDK()
	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery(
				[sdk.media.keys.get, params],
				() => sdk.media.get({ page, page_size, ...params }),
				options,
			),
		[sdk.media, page, page_size, params, options],
	)
	return { prefetch }
}

export function useMediaCursorQuery(options: CursorQueryOptions<Media>) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = useCursorQuery(
		[sdk.media.keys.getCursor],
		async (params) => sdk.media.getCursor(params),
		options,
	)

	const media = data ? data.pages.flatMap((page) => page.data) : []

	return {
		data,
		media,
		...restReturn,
	}
}

// TODO: the TVariables generic will need to change once epub can update their
// progress, since this is focused around page numbers.
export function useUpdateMediaProgress(
	mediaId: string,
	options?: MutationOptions<ProgressUpdateReturn, AxiosError, number>,
) {
	const { sdk } = useSDK()
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(
		[sdk.media.keys.updateProgress, mediaId],
		(page: number) => sdk.media.updateProgress(mediaId, page),
		options,
	)

	return { isLoading, updateReadProgress, updateReadProgressAsync }
}

export function useRecentlyAddedMediaQuery(options: CursorQueryOptions<Media>) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = useCursorQuery(
		[sdk.media.keys.recentlyAdded],
		sdk.media.recentlyAdded,
		options,
	)

	const media = data ? data.pages.flatMap((page) => page.data) : []

	return {
		data,
		media,
		...restReturn,
	}
}

export function useContinueReading(options: CursorQueryOptions<Media>) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = useCursorQuery(
		[sdk.media.keys.inProgress],
		sdk.media.inProgress,
		options,
	)

	const media = data?.pages.flatMap((page) => page.data) || []

	return {
		data,
		media,
		...restReturn,
	}
}
