import { CursorQueryParams } from '@stump/api'
import { Pageable } from '@stump/types'
import {
	MutationFunction,
	MutationKey,
	QueryClient,
	QueryFunction,
	QueryFunctionContext,
	QueryKey,
	useInfiniteQuery as useReactInfiniteQuery,
	UseInfiniteQueryOptions,
	useMutation as useReactMutation,
	UseMutationOptions,
	useQuery as useReactQuery,
	UseQueryOptions,
} from '@tanstack/react-query'
import { AxiosError, isAxiosError } from 'axios'

import { QueryClientContext, useClientContext } from './context'
import { useUserStore } from './index'

export * from './queries'
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

// TQueryFnData - The type of the data returned by the query function
// TError - The type of the error to expect from the query function
// TData - The type our data will ~eventually~ have
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
			if (isAxiosError(err) && err.response?.status === 401) {
				setUser(null)
				onRedirect?.('/auth')
			}
			onError?.(err)
		},
		...restOptions,
	})
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

export type UseCursorQueryParams = {
	initialCursor?: string
	limit?: number
	filters?: Record<string, string>
}
export type UseCursorQueryOptions<
	Entity = unknown,
	TQueryFnData extends Pageable<Array<Entity>> = Pageable<Array<Entity>>,
	TError = AxiosError,
	TData = TQueryFnData,
> = UseCursorQueryParams &
	Omit<
		UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryFnData, QueryKey>,
		'queryKey' | 'queryFn' | 'context' | 'getNextPageParam' | 'getPreviousPageParam'
	>

export type UseCursorQueryFunction<E> = (
	params: CursorQueryParams,
) => Pageable<Array<E>> | Promise<Pageable<Array<E>>>

type CursorQueryContext = {
	pageParam?: string
}
export function useCursorQuery<Entity = unknown, TError = AxiosError>(
	queryKey: QueryKey,
	queryFn: UseCursorQueryFunction<Entity>,
	options?: UseCursorQueryOptions<Entity, Pageable<Array<Entity>>, TError, Pageable<Array<Entity>>>,
) {
	const { initialCursor, limit, filters, ...restOptions } = options || {}

	const { data, ...rest } = useInfiniteQuery(
		[...queryKey, initialCursor, limit, filters],
		async ({ pageParam }: CursorQueryContext) => {
			return queryFn({
				afterId: pageParam,
				limit: limit || 20,
				params: new URLSearchParams(filters),
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
