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

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery(['getMediaById', id], () => getMediaById(id), {
		staleTime: 10 * 1000,
	})
}

export function useMedia(id: string, { onError, onSuccess }: QueryOptions<Media> = {}) {
	const {
		data: media,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(['getMediaById'], () => getMediaById(id).then((res) => res.data), {
		onError(err) {
			console.error(err)
			onError?.(err)
		},
		onSuccess,
	})

	return { isLoading: isLoading || isFetching || isRefetching, media }
}

/** Hook for fetching media after a cursor, within a series */
export function useMediaCursor(afterId: string, seriesId: string) {
	const searchParams = useMemo(() => {
		return new URLSearchParams({ cursor: afterId, series_id: seriesId })
	}, [afterId, seriesId])
	const { data: media, ...rest } = useCursorQuery(afterId, ['getMediaAfterCursor'], () =>
		getMedia(searchParams),
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
		['getRecentlyAddedMedia'],
		getRecentlyAddedMedia,
		new URLSearchParams('page_size=10'),
	)
}

export function useContinueReading() {
	return useInfinitePagedQuery(
		['getInProgressMedia'],
		getInProgressMedia,
		new URLSearchParams('page_size=10'),
	)
}
