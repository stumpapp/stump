// import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useMemo } from 'react';

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
import { useQueryParamStore } from '../stores';
import type { Library, PageInfo } from '../types';
import type { ClientQueryParams, QueryCallbacks } from '.';

export function useLibrary(id: string, options: QueryCallbacks<Library> = {}) {
	const { isLoading, data: library } = useQuery(['getLibrary', id], {
		context: StumpQueryContext,
		onError(err) {
			options.onError?.(err);
		},
		queryFn: async () => getLibraryById(id).then((res) => res.data),
	});

	return { isLoading, library };
}

export interface UseLibrariesReturn {
	libraries: Library[];
	pageData?: PageInfo;
}

export function useLibraries() {
	const { data, ...rest } = useQuery(['getLibraries'], getLibraries, {
		context: StumpQueryContext,
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

export function useLibrarySeries(libraryId: string, page = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore();

	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		['getLibrarySeries', page, libraryId, paramsStore],
		() =>
			getLibrarySeries(libraryId, page, getQueryString()).then(({ data }) => ({
				pageData: data._page,
				series: data.data,
			})),
		{
			context: StumpQueryContext,
			keepPreviousData: true,
		},
	);

	const { series, pageData } = data ?? {};

	return { isFetching, isLoading, isPreviousData, pageData, series };
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

	return { isLoading: isLoading || isRefetching || isFetching, libraryStats };
}

export function useScanLibrary({ onError }: ClientQueryParams<unknown> = {}) {
	const { mutate: scan, mutateAsync: scanAsync } = useMutation(['scanLibary'], {
		context: StumpQueryContext,
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
			context: StumpQueryContext,
			mutationFn: createLibrary,
			onError: (err) => {
				// toast.error('Login failed. Please try again.');
				onError?.(err);
			},
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
		},
	);

	const { isLoading: editIsLoading, mutateAsync: editLibraryAsync } = useMutation(['editLibrary'], {
		context: StumpQueryContext,
		mutationFn: editLibrary,
		onError: (err) => {
			onError?.(err);
			// TODO: handle this error
			// toast.error('Login failed. Please try again.');
			console.error(err);
		},
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
	});

	const { mutateAsync: deleteLibraryAsync } = useMutation(['deleteLibrary'], {
		context: StumpQueryContext,
		mutationFn: deleteLibrary,
		async onSuccess(res) {
			// FIXME: just realized invalidateQueries is async... I need to check all my usages of it...
			await queryClient.invalidateQueries(['getLibraries']);
			await queryClient.invalidateQueries(['getLibraryStats']);

			onDeleted?.(res.data);
		},
	});

	return {
		createIsLoading,
		createLibraryAsync,
		deleteLibraryAsync,
		editIsLoading,
		editLibraryAsync,
	};
}
