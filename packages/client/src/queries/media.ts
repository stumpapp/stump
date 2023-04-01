import {
	getInProgressMedia,
	getMediaById,
	getMediaWithCursor,
	getRecentlyAddedMedia,
	updateMediaProgress,
} from '@stump/api'
import type { Media, ReadProgress } from '@stump/types'
import { AxiosError } from 'axios'

import { type CursorQueryOptions, type QueryOptions, useCursorQuery, useMutation } from '../client'
import { queryClient, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'

const MEDIA_KEYS = QUERY_KEYS.media

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery([MEDIA_KEYS.getMediaById, id], () => getMediaById(id), {
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
		() => getMediaById(id).then(({ data }) => data),
		{
			keepPreviousData: false,
			...params,
		},
	)

	return { media: data, ...ret }
}

export function useMediaAfterCursorQuery(
	initialCursor: string,
	options: Omit<CursorQueryOptions<Media>, 'initialCursor'> = {},
) {
	const { data, ...restReturn } = useCursorQuery(
		[MEDIA_KEYS.getMedia],
		async (params) => {
			const { data } = await getMediaWithCursor(params)
			return data
		},
		{
			initialCursor,
			...options,
		},
	)

	const media = data ? data.pages.flatMap((page) => page.data) : []

	return {
		data,
		media,
		...restReturn,
	}
}

export function useMediaMutation(id: string, options: QueryOptions<ReadProgress> = {}) {
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(['updateReadProgress'], (page: number) => updateMediaProgress(id, page), {
		onError(err) {
			options.onError?.(err)
		},
		onSuccess(data) {
			options.onSuccess?.(data)
		},
	})

	return { isLoading, updateReadProgress, updateReadProgressAsync }
}

export function useRecentlyAddedMediaQuery(options: CursorQueryOptions<Media>) {
	const { data, ...restReturn } = useCursorQuery(
		[MEDIA_KEYS.getRecentlyAddedMedia],
		async (params) => {
			const { data } = await getRecentlyAddedMedia(params)
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
			const { data } = await getInProgressMedia(params)
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
