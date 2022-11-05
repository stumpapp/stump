import type { Media, Pageable, ReadProgress } from '../types';
import type { MutationCallbacks, QueryCallbacks } from '.';

import { useMutation, useQuery } from '@tanstack/react-query';

import { getMediaById, getRecentlyAddedMedia, updateMediaProgress } from '../api';
import { queryClient } from '../client';
import { StumpQueryContext } from '../context';
import { useCounter } from '../hooks/useCounter';

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
		context: StumpQueryContext,
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
		context: StumpQueryContext,
	});

	return { updateReadProgress, updateReadProgressAsync, isLoading };
}

// FIXME: make a generic useRecentEntity hook
export function useRecentlyAddedMedia(options: QueryCallbacks<Pageable<Media[]>> = {}) {
	const [page, actions] = useCounter(1);

	// TODO: store in state, append array on success. Otherwise, we'l clear the data each query. Not how it
	// should be on infinite scroll
	const {
		data: media,
		refetch,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(
		['getRecentlyAddedMedia', page],
		() => getRecentlyAddedMedia(page).then((res) => res.data),
		{
			onSuccess(data) {
				options.onSuccess?.(data);
			},
			onError(err) {
				options.onError?.(err);
			},
			context: StumpQueryContext,
		},
	);

	function setPage(page: number) {
		actions.set(page);
	}

	function nextPage() {
		actions.increment();
	}

	function prevPage() {
		actions.decrement();
	}

	function hasMore() {
		if (!media?._page) {
			return false;
		}

		return media._page.current_page < media._page.total_pages;
	}

	return {
		isLoading: isLoading || isFetching || isRefetching,
		media,
		refetch,
		page,
		setPage,
		nextPage,
		prevPage,
		hasMore,
	};
}
