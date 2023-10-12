import { CursorQueryParams, PagedQueryParams } from '@stump/api'
import { Pageable } from '@stump/types'
import {
	MutationFunction,
	MutationKey,
	QueryClient,
	QueryFilters,
	QueryFunction,
	QueryKey,
	useInfiniteQuery as useReactInfiniteQuery,
	UseInfiniteQueryOptions,
	useIsFetching as useReactIsFetching,
	useMutation as useReactMutation,
	UseMutationOptions,
	useQuery as useReactQuery,
	UseQueryOptions,
} from '@tanstack/react-query'
import { AxiosError, isAxiosError } from 'axios'

import { QueryClientContext, useClientContext } from './context'
import { useUserStore } from './index'

export { QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			suspense: false,
		},
	},
})

export function useIsFetching(filters?: QueryFilters) {
	return useReactIsFetching(filters, { context: QueryClientContext })
}

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
	const { onRedirect } = useClientContext() || {}
	const { setUser } = useUserStore((store) => ({
		setUser: store.setUser,
	}))
	const { onError, ...restOptions } = options || {}
	return useReactQuery(queryKey, queryFn, {
		context: QueryClientContext,
		onError: (err) => {
			const axiosError = isAxiosError(err)
			const isNetworkError = axiosError && err?.code === 'ERR_NETWORK'
			const isAuthError = axiosError && err.response?.status === 401

			if (isAuthError) {
				setUser(null)
				onRedirect?.('/auth')
			} else if (isNetworkError) {
				onRedirect?.('/server-connection-error')
			}
			onError?.(err)
		},
		...restOptions,
	})
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

export function usePageQuery<Entity = unknown, Error = AxiosError>(
	queryKey: QueryKey,
	queryFn: PageQueryFunction<Entity>,
	{
		page = 1,
		page_size = 20,
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
	const { onRedirect } = useClientContext() || {}
	const { setUser } = useUserStore((store) => ({
		setUser: store.setUser,
	}))
	const { onError, ...restOptions } = options || {}
	return useReactInfiniteQuery(queryKey, queryFn, {
		context: QueryClientContext,
		onError: (err) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				setUser(null)
				onRedirect?.('/auth')
			}
			onError?.(err)
		},
		...restOptions,
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
				afterId: pageParam || initialCursor,
				limit: limit || 20,
				params,
			})
		},
		{
			getNextPageParam: (lastPage) => {
				const hasData = !!lastPage.data.length
				if (!hasData) {
					return undefined
				}

				if (lastPage._cursor?.next_cursor) {
					return lastPage._cursor?.next_cursor
				}

				return undefined
			},
			getPreviousPageParam: (firstPage) => {
				const hasCursor = !!firstPage?._cursor?.current_cursor
				if (hasCursor) {
					return firstPage?._cursor?.current_cursor
				}
				return undefined
			},
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
	const { onRedirect } = useClientContext() || {}
	const { setUser } = useUserStore((store) => ({
		setUser: store.setUser,
	}))
	const { onError, ...restOptions } = options || {}

	return useReactMutation(mutationKey, mutationFn, {
		context: QueryClientContext,
		onError: (err, variables, context) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				setUser(null)
				onRedirect?.('/auth')
			}
			onError?.(err, variables, context)
		},
		...restOptions,
	})
}
