import type { Library, PageInfo } from '@stump/core';
import type { ClientQueryParams, QueryCallbacks } from '.';
import { AxiosError } from 'axios';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useMutation, useQuery } from '@tanstack/react-query';

import {
	createLibrary,
	deleteLibrary,
	editLibrary,
	getLibraries,
	getLibrariesStats,
	getLibraryById,
	getLibrarySeries,
	scanLibary,
} from '../api/library';
import { queryClient } from '../client';

export function useLibrary(id: string, options: QueryCallbacks<Library> = {}) {
	const { isLoading, data: library } = useQuery(['getLibrary', id], {
		queryFn: async () => getLibraryById(id).then((res) => res.data),
		onError(err) {
			options.onError?.(err);
		},
	});

	return { isLoading, library };
}

export interface UseLibrariesReturn {
	libraries: Library[];
	pageData?: PageInfo;
}

export function useLibraries() {
	const { data, ...rest } = useQuery(['getLibraries'], getLibraries, {
		// Send all non-401 errors to the error page
		useErrorBoundary: (err: AxiosError) => !err || (err.response?.status ?? 500) !== 401,
	});

	const { libraries, pageData } = useMemo<UseLibrariesReturn>(() => {
		if (data?.data) {
			return {
				libraries: data.data.data,
				pageData: data.data._page,
			};
		}

		return { libraries: [] };
	}, [data]);

	return {
		libraries,
		pageData,
		...rest,
	};
}

export function useLibrarySeries(libraryId: string) {
	// TODO: I will need to remove this (react-router-dom) dependency once
	// I start developing the mobile app...
	const [search, setSearchParams] = useSearchParams();

	const page = useMemo(() => {
		const searchPage = search.get('page');

		if (searchPage) {
			return parseInt(searchPage, 10);
		}

		return 1;
	}, [search]);

	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		['getLibrarySeries', page, libraryId],
		() => getLibrarySeries(libraryId, page),
		{
			keepPreviousData: true,
		},
	);

	const { series, pageData } = useMemo(() => {
		if (data?.data) {
			return {
				series: data.data.data,
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
		[page, series, pageData],
	);

	return { isLoading, isFetching, isPreviousData, series, pageData, actions };
}

export function useLibraryStats() {
	const {
		data: libraryStats,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getLibraryStats'], () => getLibrariesStats().then((data) => data.data));

	return { libraryStats, isLoading: isLoading || isRefetching || isFetching };
}

export function useScanLibrary({ onError }: ClientQueryParams<unknown> = {}) {
	const { mutate: scan, mutateAsync: scanAsync } = useMutation(['scanLibary'], {
		mutationFn: scanLibary,
		onError,
	});

	return { scan, scanAsync };
}

export function useLibraryMutation({
	onCreated,
	onUpdated,
	onDeleted,
	onCreateFailed,
	onUpdateFailed,
	onError,
}: ClientQueryParams<Library> = {}) {
	const { isLoading: createIsLoading, mutateAsync: createLibraryAsync } = useMutation(
		['createLibrary'],
		{
			mutationFn: createLibrary,
			onSuccess: (res) => {
				if (!res.data) {
					onCreateFailed?.(res);
				} else {
					queryClient.invalidateQueries(['getLibraries']);
					queryClient.invalidateQueries(['getJobReports']);
					onCreated?.(res.data);
					// onClose();
				}
			},
			onError: (err) => {
				// toast.error('Login failed. Please try again.');
				onError?.(err);
			},
		},
	);

	const { isLoading: editIsLoading, mutateAsync: editLibraryAsync } = useMutation(['editLibrary'], {
		mutationFn: editLibrary,
		onSuccess: (res) => {
			if (!res.data) {
				// throw new Error('Something went wrong.');
				// TODO: log?
				onUpdateFailed?.(res);
			} else {
				queryClient.invalidateQueries(['getLibraries']);
				queryClient.invalidateQueries(['getJobReports']);
				// onClose();
				onUpdated?.(res.data);
			}
		},
		onError: (err) => {
			onError?.(err);
			// TODO: handle this error
			// toast.error('Login failed. Please try again.');
			console.error(err);
		},
	});

	const { mutateAsync: deleteLibraryAsync } = useMutation(['deleteLibrary'], {
		mutationFn: deleteLibrary,
		async onSuccess(res) {
			// FIXME: just realized invalidateQueries is async... I need to check all my usages of it...
			await queryClient.invalidateQueries(['getLibraries']);
			onDeleted?.(res.data);
		},
	});

	return {
		createIsLoading,
		editIsLoading,
		createLibraryAsync,
		editLibraryAsync,
		deleteLibraryAsync,
	};
}
