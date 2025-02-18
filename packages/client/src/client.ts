import { CursorQueryParams, PagedQueryParams } from '@stump/sdk'
import { Pageable } from '@stump/sdk'
import {
	MutationFunction,
	MutationKey,
	QueriesOptions as UseQueriesOptions,
	QueryClient,
	QueryFilters,
	QueryFunction,
	QueryKey,
	useInfiniteQuery as useReactInfiniteQuery,
	UseInfiniteQueryOptions,
	useIsFetching as useReactIsFetching,
	useMutation as useReactMutation,
	UseMutationOptions,
	useQueries as useReactQueries,
	useQuery as useReactQuery,
	UseQueryOptions,
} from '@tanstack/react-query'
import { AxiosError, isAxiosError } from 'axios'

import { QueryClientContext, useClientContext } from './context'
import { useSDK } from './sdk'

export { QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			// TODO: change this and start using suspense, big big refactor...
			suspense: false,
		},
	},
})

export function useIsFetching(filters?: QueryFilters) {
	return useReactIsFetching(filters, { context: QueryClientContext })
}

// TODO: it is a bit annoying, but the onError callback will be removed in the next
// major version of react-query. I believe it just means I need to create an effect to invoke
// the appropriate callbacks. Not the biggest deal, but will need to sort that

// NOTE for future onlookers of this file: react-query has LOTS of generics. It can
// be hard to keep track of things if you're just starting, so refer to these few big
// types as a guide to understand how they use the generics:
//
// 1. TQueryFnData - The type of the data returned by the query function
// 2. TError - The type of the error to expect from the query function
// 3. TData - The type our data will ~eventually~ have
//
// A few of these base hooks have an additional generic, like Entity, which is mostly
// shorthand to derive the the others. For example, PageQueryOptions<Media> handles all
// the other generics to get a paginated API response containing Media objects.

export type QueryOptions<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData> = Omit<
	UseQueryOptions<TQueryFnData, TError, TData, QueryKey>,
	'queryKey' | 'queryFn' | 'context'
>
export function useQuery<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>(
	queryKey: QueryKey,
	queryFn: QueryFunction<TQueryFnData, QueryKey>,
	options?: QueryOptions<TQueryFnData, TError, TData>,
) {
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()
	const { sdk } = useSDK()
	return useReactQuery(queryKey, queryFn, {
		...options,
		context: QueryClientContext,
		onError: (err) => {
			const axiosError = isAxiosError(err)
			const isNetworkError = axiosError && err?.code === 'ERR_NETWORK'
			const isAuthError = axiosError && err.response?.status === 401

			if (isAuthError) {
				sdk.token = undefined
				onUnauthenticatedResponse?.('/auth', err.response?.data)
			} else if (isNetworkError) {
				onConnectionWithServerChanged?.(false)
			}
		},
	})
}

// BAD TYPES!!
export type QueriesOptions<
	T extends unknown[],
	Result extends unknown[] = [],
	Depth extends ReadonlyArray<number> = [],
> = UseQueriesOptions<T, Result, Depth>
export function useQueries<T extends unknown[]>({ queries }: { queries: QueriesOptions<T> }) {
	return useReactQueries({ context: QueryClientContext, queries })
}

type PageQueryParams = {
	/** The page to fetch */
	page?: number
	/** The number of items per page */
	page_size?: number
	/** Filters to apply to the query. The name can be a bit misleading,
	 *  since ordering and other things can be applied as well. */
	params?: Record<string, unknown>
}
export type PageQueryFunction<E> = (
	params: PagedQueryParams,
) => Pageable<Array<E>> | Promise<Pageable<Array<E>>>

export type PageQueryOptions<
	Entity = unknown,
	TQueryFnData extends Pageable<Array<Entity>> = Pageable<Array<Entity>>,
	TError = AxiosError,
	TData = TQueryFnData,
> = Omit<
	UseQueryOptions<TQueryFnData, TError, TData, QueryKey>,
	'queryKey' | 'queryFn' | 'context'
> &
	PageQueryParams

export type TypedPageQueryOptions<Entity, Filters> = Omit<
	PageQueryOptions<Entity, Pageable<Array<Entity>>, AxiosError, Pageable<Array<Entity>>>,
	'params'
> & {
	params?: Filters
}

// TODO: these types are HORRENDOUS. REWRITE THEM :sob:

export function usePageQuery<Entity = unknown, Error = AxiosError>(
	queryKey: QueryKey,
	queryFn: PageQueryFunction<Entity>,
	{
		page,
		page_size,
		params,
		...options
	}: PageQueryOptions<Entity, Pageable<Entity[]>, Error, Pageable<Entity[]>> = {},
) {
	return useQuery(
		[...queryKey, page, page_size, params],
		async () => queryFn({ page, page_size, params }),
		{
			...options,
		},
	)
}

export type InfiniteQueryOptions<
	TQueryFnData = unknown,
	TError = unknown,
	TData = TQueryFnData,
> = Omit<
	UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>,
	'queryKey' | 'queryFn' | 'context'
>
export function useInfiniteQuery<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData>(
	queryKey: QueryKey,
	queryFn: QueryFunction<TQueryFnData, QueryKey>,
	options?: InfiniteQueryOptions<TQueryFnData, TError, TData>,
) {
	const { onUnauthenticatedResponse } = useClientContext()
	return useReactInfiniteQuery(queryKey, queryFn, {
		...options,
		context: QueryClientContext,
		onError: (err) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				onUnauthenticatedResponse?.('/auth')
			}
		},
	})
}

export type CursorQueryCursorOptions = {
	initialCursor?: string
	limit?: number
	params?: Record<string, unknown>
}
export type CursorQueryOptions<
	Entity = unknown,
	TQueryFnData extends Pageable<Array<Entity>> = Pageable<Array<Entity>>,
	TError = AxiosError,
	TData = TQueryFnData,
> = Omit<
	UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>,
	'queryKey' | 'queryFn' | 'context' | 'getNextPageParam' | 'getPreviousPageParam'
> &
	CursorQueryCursorOptions & {
		queryKey?: QueryKey
	}

export type UseCursorQueryFunction<E> = (
	params: CursorQueryParams,
) => Pageable<Array<E>> | Promise<Pageable<Array<E>>>

type CursorQueryContext = {
	pageParam?: string
}
export function useCursorQuery<Entity = unknown, TError = AxiosError>(
	queryKey: QueryKey,
	queryFn: UseCursorQueryFunction<Entity>,
	options?: Omit<
		CursorQueryOptions<Entity, Pageable<Array<Entity>>, TError, Pageable<Array<Entity>>>,
		'queryKey'
	>,
) {
	const { initialCursor, limit, params, ...restOptions } = options || {}

	const { data, ...rest } = useInfiniteQuery(
		[initialCursor, limit, params, ...queryKey],
		async ({ pageParam }: CursorQueryContext) => {
			return queryFn({
				cursor: pageParam || initialCursor,
				limit: limit || 20,
				params,
			})
		},
		{
			getNextPageParam: (lastPage) => lastPage?._cursor?.next_cursor,
			getPreviousPageParam: (firstPage) => firstPage?._cursor?.current_cursor,
			keepPreviousData: true,
			...restOptions,
		},
	)

	return {
		data,
		...rest,
	}
}

export type MutationOptions<
	TData = unknown,
	TError = unknown,
	TVariables = void,
	TContext = unknown,
> = Omit<
	UseMutationOptions<TData, TError, TVariables, TContext>,
	'mutationKey' | 'mutationFn' | 'context'
>

export function useMutation<
	TData = unknown,
	TError = unknown,
	TVariables = void,
	TContext = unknown,
>(
	mutationKey: MutationKey,
	mutationFn?: MutationFunction<TData, TVariables>,
	options?: MutationOptions<TData, TError, TVariables, TContext>,
) {
	const { onUnauthenticatedResponse } = useClientContext()
	const { onError, ...restOptions } = options || {}

	return useReactMutation(mutationKey, mutationFn, {
		context: QueryClientContext,
		onError: (err, variables, context) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				onUnauthenticatedResponse?.('/auth')
			}
			onError?.(err, variables, context)
		},
		...restOptions,
	})
}
