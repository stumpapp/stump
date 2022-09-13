import type { Media, ReadProgress } from '@stump/core';
import type { MutationCallbacks, QueryCallbacks } from '.';

import { useMutation, useQuery } from '@tanstack/react-query';

import { getMediaById, updateMediaProgress } from '../api';
import { queryClient } from '../client';

export const prefetchMedia = async (id: string) => {
	await queryClient.prefetchQuery(['getMediaById', id], () => getMediaById(id), {
		staleTime: 10 * 1000,
	});
};

export function useMedia(id: string, options: QueryCallbacks<Media> = {}) {
	const {
		data: media,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(['getMediaById'], {
		queryFn: async () => getMediaById(id).then((res) => res.data),
		onSuccess(data) {
			options.onSuccess?.(data);
		},
		onError(err) {
			options.onError?.(err);
		},
	});

	return { isLoading: isLoading || isFetching || isRefetching, media };
}

export function useMediaMutation(id: string, options: MutationCallbacks<ReadProgress> = {}) {
	const {
		mutate: updateReadProgress,
		mutateAsync: updateReadProgressAsync,
		isLoading,
	} = useMutation(['updateReadProgress'], (page: number) => updateMediaProgress(id, page), {
		onSuccess(data) {
			options.onUpdated?.(data);
		},
		onError(err) {
			options.onError?.(err);
		},
	});

	return { updateReadProgress, updateReadProgressAsync, isLoading };
}
