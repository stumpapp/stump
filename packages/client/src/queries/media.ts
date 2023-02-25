import {
	getInProgressMedia,
	getMedia,
	getMediaById,
	getRecentlyAddedMedia,
	updateMediaProgress,
} from '@stump/api'
import type { Media, ReadProgress } from '@stump/types'
import { useMemo } from 'react'

import { QueryOptions, useCursorQuery, useInfinitePagedQuery, useMutation } from '../client'
import { queryClient, useQuery } from '../client'
import { QUERY_KEYS } from '../query_keys'

const MEDIA_KEYS = QUERY_KEYS.media

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery([MEDIA_KEYS.get_by_id, id], () => getMediaById(id), {
		staleTime: 10 * 1000,
	})
}

export function useMediaById(id: string, { onError }: QueryOptions<Media> = {}) {
	const { data, isLoading, isFetching, isRefetching } = useQuery(
		[MEDIA_KEYS.get_by_id, id],
		() => getMediaById(id),
		{
			keepPreviousData: false,
			onError(err) {
				console.error(err)
				onError?.(err)
			},
		},
	)

	return { isLoading: isLoading || isFetching || isRefetching, media: data?.data }
}

/** Hook for fetching media after a cursor, within a series */
export function useMediaCursor(afterId: string, seriesId: string) {
	const searchParams = useMemo(() => {
		return new URLSearchParams({ cursor: afterId, series_id: seriesId })
	}, [afterId, seriesId])
	const { data: media, ...rest } = useCursorQuery(
		afterId,
		[MEDIA_KEYS.get_with_cursor, afterId],
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
		[MEDIA_KEYS.recently_added],
		getRecentlyAddedMedia,
		new URLSearchParams('page_size=10'),
	)
}

export function useContinueReading() {
	return useInfinitePagedQuery(
		[MEDIA_KEYS.in_progress],
		getInProgressMedia,
		new URLSearchParams('page_size=10'),
	)
}
