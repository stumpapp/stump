import type { Library, PageInfo } from '@stump/core';
import type { ClientQueryParams, QueryCallbacks } from '.';
import { AxiosError } from 'axios';
import { useMemo } from 'react';
// import { useSearchParams } from 'react-router-dom';

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
import { StumpQueryContext } from '../context';

export function useLibrary(id: string, options: QueryCallbacks<Library> = {}) {
	const { isLoading, data: library } = useQuery(['getLibrary', id], {
		queryFn: async () => getLibraryById(id).then((res) => res.data),
		onError(err) {
			options.onError?.(err);
		},
		context: StumpQueryContext,
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
		context: StumpQueryContext,
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

export function useLibrarySeries(libraryId: string, page: number = 1) {
	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		['getLibrarySeries', page, libraryId],
		() =>
			getLibrarySeries(libraryId, page).then(({ data }) => ({
				series: data.data,
				pageData: data._page,
			})),
		{
			keepPreviousData: true,
			context: StumpQueryContext,
		},
	);

	const { series, pageData } = data ?? {};

	return { isLoading, isFetching, isPreviousData, series, pageData };
}

export function useLibraryStats() {
	const {
		data: libraryStats,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getLibraryStats'], () => getLibrariesStats().then((data) => data.data), {
		context: StumpQueryContext,
	});

	return { libraryStats, isLoading: isLoading || isRefetching || isFetching };
}

export function useScanLibrary({ onError }: ClientQueryParams<unknown> = {}) {
	const { mutate: scan, mutateAsync: scanAsync } = useMutation(['scanLibary'], {
		mutationFn: scanLibary,
		onError,
		context: StumpQueryContext,
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
					queryClient.invalidateQueries(['getLibraryStats']);
					onCreated?.(res.data);
					// onClose();
				}
			},
			onError: (err) => {
				// toast.error('Login failed. Please try again.');
				onError?.(err);
			},
			context: StumpQueryContext,
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
				queryClient.invalidateQueries(['getLibraryStats']);
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
		context: StumpQueryContext,
	});

	const { mutateAsync: deleteLibraryAsync } = useMutation(['deleteLibrary'], {
		mutationFn: deleteLibrary,
		async onSuccess(res) {
			// FIXME: just realized invalidateQueries is async... I need to check all my usages of it...
			await queryClient.invalidateQueries(['getLibraries']);
			await queryClient.invalidateQueries(['getLibraryStats']);

			onDeleted?.(res.data);
		},
		context: StumpQueryContext,
	});

	return {
		createIsLoading,
		editIsLoading,
		createLibraryAsync,
		editLibraryAsync,
		deleteLibraryAsync,
	};
}
