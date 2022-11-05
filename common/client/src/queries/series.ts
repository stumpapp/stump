import type { Media, Pageable, Series } from '../types';
import type { QueryCallbacks } from '.';
import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getNextInSeries, getRecentlyAddedSeries, getSeriesById, getSeriesMedia } from '../api';
import { queryClient } from '../client';
import { StumpQueryContext } from '../context';
import { useQueryParamStore } from '../stores';
import { useCounter } from '../hooks/useCounter';

export const prefetchSeries = async (id: string) => {
	await queryClient.prefetchQuery(['getSeries', id], () => getSeriesById(id), {
		staleTime: 10 * 1000,
	});
};

export function useSeries(id: string, options: QueryCallbacks<Series> = {}) {
	const {
		isLoading,
		isFetching,
		isRefetching,
		data: series,
	} = useQuery(['getSeries'], {
		queryFn: async () => getSeriesById(id).then((res) => res.data),
		onSuccess(data) {
			options.onSuccess?.(data);
		},
		onError(err) {
			options.onError?.(err);
		},
		context: StumpQueryContext,
	});

	return { isLoading: isLoading || isFetching || isRefetching, series };
}

export function useSeriesMedia(seriesId: string, page: number = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore();

	const { isLoading, isFetching, isRefetching, isPreviousData, data } = useQuery(
		['getSeriesMedia', page, seriesId, paramsStore],
		() =>
			getSeriesMedia(seriesId, page, getQueryString()).then(({ data }) => ({
				media: data.data,
				pageData: data._page,
			})),
		{
			keepPreviousData: true,
			context: StumpQueryContext,
		},
	);

	const { media, pageData } = data ?? {};

	return {
		isLoading: isLoading || isFetching || isRefetching,
		isPreviousData,
		media,
		pageData,
	};
}

export function useRecentlyAddedSeries(options: QueryCallbacks<Pageable<Series[]>> = {}) {
	const [page, actions] = useCounter(1);

	const {
		data: series,
		refetch,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(
		['getRecentlyAddedSeries', page],
		() => getRecentlyAddedSeries(page).then((res) => res.data),
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
		if (!series?._page) {
			return false;
		}

		return series._page.current_page < series._page.total_pages;
	}

	return {
		isLoading: isLoading || isFetching || isRefetching,
		series,
		refetch,
		page,
		setPage,
		nextPage,
		prevPage,
		hasMore,
	};
}

export function useUpNextInSeries(id: string, options: QueryCallbacks<Media> = {}) {
	const {
		data: media,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(['getNextInSeries', id], () => getNextInSeries(id).then((res) => res.data), {
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
