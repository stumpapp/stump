import {
	getInProgressMedia,
	getMediaById,
	getRecentlyAddedMedia,
	updateMediaProgress,
} from '@stump/api'
import type { Media, Pageable, ReadProgress } from '@stump/types'

import { useMutation } from '../client'
import { queryClient, useQuery } from '../client'
import { MutationCallbacks, QueryCallbacks, usePagedQuery } from '.'

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery(['getMediaById', id], () => getMediaById(id), {
		staleTime: 10 * 1000,
	})
}

export function useMedia(id: string, { onError, onSuccess }: QueryCallbacks<Media> = {}) {
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

export function useMediaMutation(id: string, options: MutationCallbacks<ReadProgress> = {}) {
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
