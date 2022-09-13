import type { Media, Series } from '@stump/core';
import type { QueryCallbacks } from '.';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

import { getNextInSeries, getSeriesById, getSeriesMedia } from '../api';
import { queryClient } from '../client';

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
	});

	return { isLoading: isLoading || isFetching || isRefetching, series };
}

export function useSeriesMedia(seriesId: string) {
	// TODO: I will need to remove this react-router-dom dependency when I start developing the mobile app...
	const [search, setSearchParams] = useSearchParams();

	const page = useMemo(() => {
		const searchPage = search.get('page');

		if (searchPage) {
			return parseInt(searchPage, 10);
		}

		return 1;
	}, [search]);

	const { isLoading, isFetching, isRefetching, isPreviousData, data } = useQuery(
		['getSeriesMedia', page, seriesId],
		() => getSeriesMedia(seriesId, page),
		{
			keepPreviousData: true,
		},
	);

	const { media, pageData } = useMemo(() => {
		if (data?.data) {
			return {
				media: data.data.data,
				pageData: data.data._page,
			};
		}

		return {};
	}, [data]);

	// Note: I am leaving these here for now, but I think they should be removed.
	// The Pagination.tsx component will use navigation to handle pagination, so these
	// manual actions aren't really necessary.
	const actions = useMemo(
		() => ({
			hasMore() {
				return !!pageData && page + 1 < pageData.totalPages;
			},
			next() {
				if (actions.hasMore()) {
					search.set('page', (page + 1).toString());
					setSearchParams(search);
				}
			},
		}),
		[page, media, pageData],
	);

	return {
		isLoading: isLoading || isFetching || isRefetching,
		isPreviousData,
		media,
		pageData,
		actions,
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
	});

	return { isLoading: isLoading || isFetching || isRefetching, media };
}
