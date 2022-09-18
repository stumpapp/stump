import type { Media, Series } from '@stump/core';
import type { QueryCallbacks } from '.';
import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getNextInSeries, getSeriesById, getSeriesMedia } from '../api';
import { queryClient } from '../client';
import { StumpQueryContext } from '../context';
import { useQueryParamStore } from '../stores';

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
