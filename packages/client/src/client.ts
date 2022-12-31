import {
	MutationFunction,
	MutationKey,
	QueryClient,
	QueryFunction,
	QueryKey,
	useMutation as useReactMutation,
	UseMutationOptions,
	useQuery as useReactQuery,
	UseQueryOptions,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { QueryClientContext, useClientContext } from './context'

export * from './queries'
export { QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			suspense: true,
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
	const { onError, ...restOptions } = options || {}
	return useReactQuery(queryKey, queryFn, {
		context: QueryClientContext,
		onError: (err) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				onRedirect?.('/auth')
			}
			onError?.(err)
		},
		...restOptions,
	})
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
	const { onError, ...restOptions } = options || {}

	return useReactMutation(mutationKey, mutationFn, {
		context: QueryClientContext,
		onError: (err, variables, context) => {
			if (isAxiosError(err) && err.response?.status === 401) {
				onRedirect?.('/auth')
			}
			onError?.(err, variables, context)
		},
		...restOptions,
	})
}
