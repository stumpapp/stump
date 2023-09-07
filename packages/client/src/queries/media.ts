import { mediaApi, mediaQueryKeys } from '@stump/api'
import type { Media, ReadProgress } from '@stump/types'
import { AxiosError } from 'axios'

import {
	type CursorQueryOptions,
	MutationOptions,
	PageQueryOptions,
	type QueryOptions,
	useCursorQuery,
	useMutation,
	usePageQuery,
} from '../client'
import { queryClient, useQuery } from '../client'

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery(
		[mediaQueryKeys.getMediaById, id],
		() => mediaApi.getMediaById(id),
		{
			staleTime: 10 * 1000,
		},
	)
}

type MediaQueryParams<TQueryFnData, TData = TQueryFnData> = QueryOptions<
	TQueryFnData,
	AxiosError,
	TData
>

export function useMediaByIdQuery(id: string, params: MediaQueryParams<Media> = {}) {
	const { data, ...ret } = useQuery(
		[mediaQueryKeys.getMediaById, id],
		() => mediaApi.getMediaById(id).then(({ data }) => data),
		{
			keepPreviousData: false,
			...params,
		},
	)

	return { media: data, ...ret }
}

export function usePagedMediaQuery(options: PageQueryOptions<Media> = {}) {
	const { data, ...restReturn } = usePageQuery(
		[mediaQueryKeys.getMedia, options],
		async ({ page, page_size, params }) => {
			const { data } = await mediaApi.getMedia({ page, page_size, ...(params ?? {}) })
			return data
		},
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

export function useMediaCursorQuery(options: CursorQueryOptions<Media>) {
	const { data, ...restReturn } = useCursorQuery(
		[mediaQueryKeys.getMedia],
		async (params) => {
			const { data } = await mediaApi.getMediaWithCursor(params)
			return data
		},
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
	options?: MutationOptions<ReadProgress, AxiosError, number>,
) {
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(
		[mediaQueryKeys.updateMediaProgress, mediaId],
		async (page: number) => {
			const { data } = await mediaApi.updateMediaProgress(mediaId, page)
			return data
		},
		options,
	)

	return { isLoading, updateReadProgress, updateReadProgressAsync }
}

export function useRecentlyAddedMediaQuery(options: CursorQueryOptions<Media>) {
	const { data, ...restReturn } = useCursorQuery(
		[mediaQueryKeys.getRecentlyAddedMedia],
		async (params) => {
			const { data } = await mediaApi.getRecentlyAddedMedia(params)
			return data
		},
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
	const { data, ...restReturn } = useCursorQuery(
		[mediaQueryKeys.getInProgressMedia],
		async (params) => {
			const { data } = await mediaApi.getInProgressMedia(params)
			return data
		},
		options,
	)

	const media = data?.pages.flatMap((page) => page.data) || []

	return {
		data,
		media,
		...restReturn,
	}
}
