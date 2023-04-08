import { mediaApi, mediaQueryKeys } from '@stump/api'
import type { Media, ReadProgress } from '@stump/types'
import { AxiosError } from 'axios'

import {
	type CursorQueryOptions,
	MutationOptions,
	type QueryOptions,
	useCursorQuery,
	useMutation,
} from '../client'
import { queryClient, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'

const MEDIA_KEYS = QUERY_KEYS.media

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery([MEDIA_KEYS.getMediaById, id], () => mediaApi.getMediaById(id), {
		staleTime: 10 * 1000,
	})
}

type MediaQueryParams<TQueryFnData, TData = TQueryFnData> = QueryOptions<
	TQueryFnData,
	AxiosError,
	TData
>

export function useMediaByIdQuery(id: string, params: MediaQueryParams<Media> = {}) {
	const { data, ...ret } = useQuery(
		[MEDIA_KEYS.getMediaById, id],
		() => mediaApi.getMediaById(id).then(({ data }) => data),
		{
			keepPreviousData: false,
			...params,
		},
	)

	return { media: data, ...ret }
}

export function useMediaCursorQuery(options: CursorQueryOptions<Media>) {
	const { data, ...restReturn } = useCursorQuery(
		[MEDIA_KEYS.getMedia],
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
		[MEDIA_KEYS.getRecentlyAddedMedia],
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
		[MEDIA_KEYS.getInProgressMedia],
		async (params) => {
			const { data } = await mediaApi.getInProgressMedia(params)
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
