import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
	ApiResult,
	DirectoryListing,
	Library,
	PageInfo,
	Tag,
	User,
	UserPreferences,
} from '@stump/core';
import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';

import { checkIsClaimed } from './api';
import { login, me, register } from './api/auth';
import {
	createLibrary,
	editLibrary,
	getLibraries,
	getLibrariesStats,
	getLibrarySeries,
} from './api/library';
import { createTags as createTagsFn, getAllTags } from './api/tag';
import { listDirectory } from './api/filesystem';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			refetchOnWindowFocus: false,
			suspense: true,
		},
	},
});

// TODO: potentially move hooks out? not sure yet...

interface QueryCallbacks<T> {
	onSuccess?: (data?: T | null) => void;
	onError?: (data: unknown) => void;
}

interface MutationCallbacks<T> {
	onCreated?: (data: T) => void;
	onUpdated?: (data: T) => void;
	onDeleted?: (data: T) => void;
	onCreateFailed?: (res: ApiResult<T>) => void;
	onUpdateFailed?: (res: ApiResult<T>) => void;
	onDeleteFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export type ClientQueryParams<T> = QueryCallbacks<T> & MutationCallbacks<T>;

interface AuthQueryOptions {
	disabled?: boolean;
	onSuccess?: (user: User | null) => void;
}

export function useAuthQuery(options: AuthQueryOptions = {}) {
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(['getViewer'], me, {
		onSuccess(res) {
			options.onSuccess?.(res.data);
		},
		useErrorBoundary: false,
	});

	return {
		user: data,
		error,
		isLoading: isLoading || isFetching || isRefetching,
	};
}

export function useUserPreferences() {
	// const { mutateAsync } = useMutation(
	// 	['updateUserPreferences', user?.id],
	// 	(preferences: UserPreferences) => updateUserPreferences(user!.id, preferences),
	// 	{
	// 		onSuccess(res) {
	// 			// setUserPreferences(res.data);
	// 		},
	// 	},
	// );
	// function updatePreferences(preferences: UserPreferences, showToast = false) {
	// 	if (user?.id && preferences) {
	// 		if (showToast) {
	// 			toast.promise(mutateAsync(preferences), {
	// 				loading: 'Updating...',
	// 				success: 'Preferences updated!',
	// 				error: 'Failed to update preferences.',
	// 			});
	// 		} else {
	// 			mutateAsync(preferences).catch((err) => {
	// 				console.error(err);
	// 			});
	// 		}
	// 	}
	// }
	// TODO: handle on 401?
	// return { user, preferences: user?.userPreferences, updatePreferences };
}

export function useLoginOrRegister({ onSuccess, onError }: ClientQueryParams<User>) {
	const [isClaimed, setIsClaimed] = useState(true);

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(['checkIsClaimed'], {
		queryFn: checkIsClaimed,
	});

	useEffect(() => {
		if (claimCheck?.data && !claimCheck.data.isClaimed) {
			setIsClaimed(false);
		}
	}, [claimCheck]);

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation(['loginUser'], {
		mutationFn: login,
		onSuccess: (res) => {
			if (!res.data) {
				onError?.(res);
			} else {
				queryClient.invalidateQueries(['getLibraries']);

				onSuccess?.(res.data);
			}
		},
		onError: (err) => {
			onError?.(err);
		},
	});

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(['registerUser'], {
		mutationFn: register,
		// onError(err) {
		// 	onError?.(err);
		// },
	});

	return {
		isClaimed,
		isCheckingClaimed,
		isLoggingIn,
		isRegistering,
		loginUser,
		registerUser,
	};
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

export function useLibraryMutation({
	onCreated,
	onUpdated,
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

	return { createIsLoading, editIsLoading, createLibraryAsync, editLibraryAsync };
}

export interface UseTagsConfig {
	onQuerySuccess?: (res: ApiResult<Tag[]>) => void;
	onQueryError?: (err: AxiosError) => void;
	onCreateSuccess?: (res: ApiResult<Tag[]>) => void;
	onCreateError?: (err: AxiosError) => void;
}

export interface TagOption {
	label: string;
	value: string;
}

export function useTags({
	onQuerySuccess,
	onQueryError,
	onCreateSuccess,
	onCreateError,
}: UseTagsConfig = {}) {
	const { data, isLoading, refetch } = useQuery(['getAllTags'], {
		queryFn: getAllTags,
		onSuccess: onQuerySuccess,
		onError: onQueryError,
		suspense: false,
	});

	const {
		mutate: createTags,
		mutateAsync: createTagsAsync,
		isLoading: isCreating,
	} = useMutation(['createTags'], {
		mutationFn: createTagsFn,
		onSuccess(res) {
			onCreateSuccess?.(res);

			queryClient.refetchQueries(['getAllTags']);
		},
		onError: onCreateError,
	});

	const { tags, options } = useMemo(() => {
		if (data && data.data) {
			const tagOptions = data.data.map(
				(tag) =>
					({
						label: tag.name,
						value: tag.name,
					} as TagOption),
			);

			return { tags: data.data, options: tagOptions };
		}

		return { tags: [], options: [] };
	}, [data]);

	return {
		tags,
		options,
		isLoading,
		refetch,
		createTags,
		createTagsAsync,
		isCreating,
	};
}

export interface DirectoryListingQueryParams {
	enabled: boolean;
	startingPath?: string;
}

export function useDirectoryListing({ enabled, startingPath }: DirectoryListingQueryParams) {
	const [path, setPath] = useState(startingPath || '/');

	const [directoryListing, setDirectoryListing] = useState<DirectoryListing>();

	async function queryFn() {
		return listDirectory({ path });
	}

	const { isLoading, error } = useQuery(['listDirectory', path], queryFn, {
		// Do not run query until `enabled` aka modal is opened.
		enabled,
		suspense: false,
		onSuccess(res) {
			setDirectoryListing(res.data);
		},
	});

	const actions = useMemo(
		() => ({
			goBack() {
				if (directoryListing?.parent) {
					setPath(directoryListing.parent);
				}
			},
			onSelect(directory: string) {
				setPath(directory);
			},
		}),
		[directoryListing],
	);

	const errorMessage = useMemo(() => {
		let err = error as AxiosError;

		if (err?.response?.data) {
			if (err.response.status === 404) {
				return 'Directory not found';
			} else {
				return err.response.data as string;
			}
		}

		return null;
	}, [error]);

	return {
		isLoading,
		error,
		errorMessage,
		path,
		entries: directoryListing?.files ?? [],
		parent: directoryListing?.parent,
		directories: directoryListing?.files.filter((f) => f.isDirectory) ?? [],
		// files: directoryListing?.files.filter((f) => !f.isDirectory) ?? [],
		...actions,
	};
}
