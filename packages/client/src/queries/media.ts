import { useMutation, useQuery } from '@tanstack/react-query'

import {
	getInProgressMedia,
	getMediaById,
	getRecentlyAddedMedia,
	updateMediaProgress,
} from '../api'
import { queryClient } from '../client'
import { StumpQueryContext } from '../context'
import type { Media, Pageable, ReadProgress } from '../types'
import { MutationCallbacks, QueryCallbacks, usePagedQuery } from '.'

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery(['getMediaById', id], () => getMediaById(id), {
		staleTime: 10 * 1000,
	})
}

export function useMedia(id: string, options: QueryCallbacks<Media> = {}) {
	const {
		data: media,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(['getMediaById'], {
		context: StumpQueryContext,
		onError(err) {
			options.onError?.(err)
		},
		onSuccess(data) {
			options.onSuccess?.(data)
		},
		queryFn: async () => getMediaById(id).then((res) => res.data),
	})

	return { isLoading: isLoading || isFetching || isRefetching, media }
}

export function useMediaMutation(id: string, options: MutationCallbacks<ReadProgress> = {}) {
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(['updateReadProgress'], (page: number) => updateMediaProgress(id, page), {
		context: StumpQueryContext,
		onError(err) {
			options.onError?.(err)
		},
		onSuccess(data) {
			options.onUpdated?.(data)
		},
	})

	return { isLoading, updateReadProgress, updateReadProgressAsync }
}

export function useRecentlyAddedMedia(options: QueryCallbacks<Pageable<Media[]>> = {}) {
	return usePagedQuery(
		'getRecentlyAddedMedia',
		getRecentlyAddedMedia,
		options,
		new URLSearchParams('page_size=10'),
	)
}

export function useContinueReading(options: QueryCallbacks<Pageable<Media[]>> = {}) {
	return usePagedQuery(
		'getInProgressMedia',
		getInProgressMedia,
		options,
		new URLSearchParams('page_size=10'),
	)
}
