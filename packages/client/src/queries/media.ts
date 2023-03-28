import {
	getInProgressMedia,
	getMedia,
	getMediaById,
	getRecentlyAddedMedia,
	updateMediaProgress,
} from '@stump/api'
import type { Media, ReadProgress } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

import { QueryOptions, useCursorQuery, useInfinitePagedQuery, useMutation } from '../client'
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

// TODO: refactor once types are better in client.ts
/** Hook for fetching media after a cursor, within a series */
export function useMediaCursor(afterId: string, seriesId: string) {
	const searchParams = useMemo(() => {
		return new URLSearchParams({ cursor: afterId, series_id: seriesId })
	}, [afterId, seriesId])
	const { data: media, ...rest } = useCursorQuery(
		afterId,
		[MEDIA_KEYS.getMediaWithCursor, afterId],
		() => getMedia(searchParams),
	)

	return { media, ...rest }
}

export function useMediaMutation(id: string, options: QueryOptions<ReadProgress> = {}) {
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(['updateReadProgress'], (page: number) => updateMediaProgress(id, page), {
		// context: StumpQueryContext,
		onError(err) {
			options.onError?.(err)
		},
		onSuccess(data) {
			options.onSuccess?.(data)
		},
	})

	return { isLoading, updateReadProgress, updateReadProgressAsync }
}

export function useRecentlyAddedMedia() {
	return useInfinitePagedQuery(
		[MEDIA_KEYS.getRecentlyAddedMedia],
		getRecentlyAddedMedia,
		new URLSearchParams('page_size=10'),
	)
}

export function useContinueReading() {
	return useInfinitePagedQuery(
		[MEDIA_KEYS.getInProgressMedia],
		getInProgressMedia,
		new URLSearchParams('page_size=10'),
	)
}
