import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getNextInSeries, getRecentlyAddedSeries, getSeriesById, getSeriesMedia } from '../api';
import { queryClient } from '../client';
import { StumpQueryContext } from '../context';
import { useCounter } from '../hooks/useCounter';
import { useQueryParamStore } from '../stores';
import type { Media, Pageable, Series } from '../types';
import { QueryCallbacks, usePagedQuery } from '.';

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
		context: StumpQueryContext,
		onError(err) {
			options.onError?.(err);
		},
		onSuccess(data) {
			options.onSuccess?.(data);
		},
		queryFn: async () => getSeriesById(id).then((res) => res.data),
	});

	return { isLoading: isLoading || isFetching || isRefetching, series };
}

export function useSeriesMedia(seriesId: string, page = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore();

	const { isLoading, isFetching, isRefetching, isPreviousData, data } = useQuery(
		['getSeriesMedia', page, seriesId, paramsStore],
		() =>
			getSeriesMedia(seriesId, page, getQueryString()).then(({ data }) => ({
				media: data.data,
				pageData: data._page,
			})),
		{
			context: StumpQueryContext,
			keepPreviousData: true,
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
	return usePagedQuery(
		'getRecentlyAddedSeries',
		getRecentlyAddedSeries,
		options,
		new URLSearchParams('page_size=50'),
	);
}

export function useInfinite() {
	const {
		status,
		data: pageData,
		error,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery(
		['getRecentlyAddedSeries'],
		(ctx) => getRecentlyAddedSeries(ctx.pageParam, new URLSearchParams('page_size=50')),
		{
			getNextPageParam: (_lastGroup, groups) => groups.length,
		},
	);

	const data = pageData ? pageData.pages.flatMap((res) => res.data.data) : [];

	return {
		data,
	};
}

export function useUpNextInSeries(id: string, options: QueryCallbacks<Media> = {}) {
	const {
		data: media,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(['getNextInSeries', id], () => getNextInSeries(id).then((res) => res.data), {
		context: StumpQueryContext,
		onError(err) {
			options.onError?.(err);
		},
		onSuccess(data) {
			options.onSuccess?.(data);
		},
	});

	return { isLoading: isLoading || isFetching || isRefetching, media };
}
