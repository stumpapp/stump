import { ApiResult } from '@stump/api'
import { Pageable } from '@stump/types'
import {
	MutationFunction,
	MutationKey,
	QueryClient,
	QueryFunction,
	QueryKey,
	useInfiniteQuery,
	UseInfiniteQueryOptions,
	useMutation as useReactMutation,
	UseMutationOptions,
	useQuery as useReactQuery,
	UseQueryOptions,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useMemo } from 'react'

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

export type QueryOptions<
	TQueryFnData = unknown,
	TError = unknown,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = Omit<
	UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
	'queryKey' | 'queryFn' | 'context'
>
export function useQuery<
	TQueryFnData = unknown,
	TError = unknown,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>(
	queryKey: TQueryKey,
	queryFn: QueryFunction<TQueryFnData, TQueryKey>,
	options?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
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

// FIXME: not very happy with the types here for infinite queries, a little more
// tedious than normal query wrappers
export type InfiniteQueryOptions<
	TQueryFnData = unknown,
	TError = unknown,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = Omit<
	UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>,
	'queryKey' | 'queryFn' | 'context'
>
export function useInfinitePagedQuery<Entity, TQueryKey extends QueryKey = QueryKey>(
	queryKey: TQueryKey,
	queryFn: (page: number, searchParams?: URLSearchParams) => Promise<ApiResult<Pageable<Entity[]>>>,
	searchParams = new URLSearchParams(),
	options?: {
		onError?: (err: unknown) => void
	},
) {
	const { onRedirect } = useClientContext() || {}
	const { setUser } = useUserStore((store) => ({
		setUser: store.setUser,
	}))
	const { onError } = options || {}
	const {
		data: pageData,
		fetchNextPage,
		hasNextPage,
		isFetching,
		isFetchingNextPage,
		isLoading,
		...rest
	} = useInfiniteQuery(queryKey, (ctx) => queryFn(ctx.pageParam || 1, searchParams), {
		context: QueryClientContext,
		getNextPageParam: (res) => {
			const lastGroup = res.data
			if (lastGroup._page) {
				const currentPage = lastGroup._page.current_page
				const totalPages = lastGroup._page.total_pages

				if (currentPage < totalPages) {
					return lastGroup._page?.current_page + 1
				}
			}

			return undefined
		},
		keepPreviousData: true,
		onError: (err) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				setUser(null)
				onRedirect?.('/auth')
			}
			onError?.(err)
		},
	})

	const data =
		pageData?.pages.flatMap((res) => {
			const pageable = res.data
			return pageable.data
		}) ?? []

	return {
		data,
		fetchMore: fetchNextPage,
		hasMore: hasNextPage,
		isFetching: isFetching || isFetchingNextPage,
		isFetchingNextPage,
		isLoading: isLoading,
		...rest,
	}
}

// FIXME: make this independent of the paged query, API now supports `_cursor` param
export function useCursorQuery<Entity, TQueryKey extends QueryKey = QueryKey>(
	cursor: string,
	queryKey: TQueryKey,
	queryFn: (page: number, searchParams?: URLSearchParams) => Promise<ApiResult<Pageable<Entity[]>>>,
	searchParams = new URLSearchParams(),
) {
	const params = useMemo(() => {
		const params = new URLSearchParams(searchParams)
		params.set('cursor', cursor)
		return params
	}, [cursor, searchParams])

	return useInfinitePagedQuery<Entity, TQueryKey>(
		queryKey,
		(page, searchParams) => queryFn(page, searchParams),
		params,
	)
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
		'mutationKey' | 'mutationFn' | 'context'
	>,
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
