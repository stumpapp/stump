import {
	QueryKey,
	useInfiniteQuery,
	useQuery as useReactQuery,
	useMutation as useReactMutation,
	MutationKey,
	MutationFunction,
	UseMutationOptions,
	QueryFunction,
	UseQueryOptions,
} from '@tanstack/react-query';
import { StumpQueryContext } from '../context';
import type { ApiResult, Pageable, PageableApiResult } from '../types';

export * from './auth';
export * from './epub';
export * from './filesystem';
export * from './job';
export * from './library';
export * from './media';
export * from './series';
export * from './tag';
export * from './server';
export * from './user';

export interface QueryCallbacks<T> {
	onSuccess?: (data?: T | null) => void;
	onError?: (data: unknown) => void;
}

export interface CreateCallbacks<T> {
	onCreated?: (data: T) => void;
	onCreateFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export interface UpdateCallbacks<T> {
	onUpdated?: (data: T) => void;
	onUpdateFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export interface DeleteCallbacks<T> {
	onDeleted?: (data: T) => void;
	onDeleteFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export type MutationCallbacks<T> = CreateCallbacks<T> & UpdateCallbacks<T> & DeleteCallbacks<T>;
export type ClientQueryParams<T> = QueryCallbacks<T> & MutationCallbacks<T>;

// TODO: I think it would be better to split up some of my mutations into updates
// and creates. I think that would make it easier to handle errors and loading states.

export function usePagedQuery<T>(
	key: string,
	queryFn: (page: number, params?: URLSearchParams) => Promise<PageableApiResult<T[]>>,
	options: QueryCallbacks<Pageable<T[]>> = {},
	params?: URLSearchParams,
) {
	const {
		data: pageData,
		isLoading,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
		...rest
	} = useInfiniteQuery([key], (ctx) => queryFn(ctx.pageParam || 1, params), {
		getNextPageParam: (lastGroup) => {
			if (lastGroup?.data._page) {
				const currentPage = lastGroup.data._page.current_page;
				const totalPages = lastGroup.data._page.total_pages;

				if (currentPage < totalPages) {
					return lastGroup.data._page?.current_page + 1;
				}
			}
		},
		keepPreviousData: true,
		context: StumpQueryContext,
	});

	const data = pageData ? pageData.pages.flatMap((res) => res.data.data) : [];

	return {
		data,
		isLoading: isLoading,
		isFetching: isFetching || isFetchingNextPage,
		hasMore: hasNextPage,
		fetchMore: fetchNextPage,
		isFetchingNextPage,
		...rest,
	};
}

export function useQuery<
	TQueryFnData = unknown,
	TError = unknown,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	queryKey: TQueryKey,
	queryFn: QueryFunction<TQueryFnData, TQueryKey>,
	options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>,
) {
	return useReactQuery(queryKey, queryFn, {
		context: StumpQueryContext,
		...options,
	});
}

export function useMutation<
	TData = unknown,
	TError = unknown,
	TVariables = void,
	TContext = unknown,
>(
	mutationKey: MutationKey,
	mutationFn?: MutationFunction<TData, TVariables>,
	options?: Omit<
		UseMutationOptions<TData, TError, TVariables, TContext>,
		'mutationKey' | 'mutationFn'
	>,
) {
	return useReactMutation(mutationKey, mutationFn, {
		context: StumpQueryContext,
		...options,
	});
}
