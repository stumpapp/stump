import { IStumpClientContext, useClientContext } from '@/context'
import { useSDK } from '@/sdk'
import type { TypedDocumentString, Pagination, PaginationInfo } from '@stump/graphql'
import { Api } from '@stump/sdk'
import {
	useSuspenseInfiniteQuery,
	UseSuspenseInfiniteQueryResult,
	useQuery,
	useSuspenseQuery,
	UseSuspenseQueryResult,
	type UseQueryResult,
	InfiniteData,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { match } from 'ts-pattern'

// TODO: fix type errors...

type ErrorHandlerParams = {
	sdk: Api
	error: unknown
} & Pick<IStumpClientContext, 'onUnauthenticatedResponse' | 'onConnectionWithServerChanged'>
const handleError = ({
	sdk,
	error,
	onUnauthenticatedResponse,
	onConnectionWithServerChanged,
}: ErrorHandlerParams) => {
	if (!error) return
	const axiosError = isAxiosError(error)
	const isNetworkError = axiosError && error?.code === 'ERR_NETWORK'
	const isAuthError = axiosError && error.response?.status === 401
	if (isAuthError) {
		sdk.token = undefined
		onUnauthenticatedResponse?.('/auth', error.response?.data)
	} else if (isNetworkError) {
		onConnectionWithServerChanged?.(false)
	}
}

export function useGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): UseQueryResult<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const { error, ...rest } = useQuery({
		queryKey: ['foo'],
		queryFn: async () => {
			const response = await sdk.execute(document, variables)
			return response
		},
	})

	useEffect(() => {
		if (!error) return
		handleError({
			sdk,
			error,
			onUnauthenticatedResponse,
			onConnectionWithServerChanged,
		})
	}, [error, sdk, onUnauthenticatedResponse, onConnectionWithServerChanged])

	return { error, ...rest } as UseQueryResult<TResult>
}

export function useSuspenseGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): UseSuspenseQueryResult<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const { error, ...rest } = useSuspenseQuery({
		queryKey: ['foo'],
		queryFn: async () => {
			const response = await sdk.execute(document, variables)
			return response
		},
	})

	useEffect(() => {
		if (!error) return
		handleError({
			sdk,
			error,
			onUnauthenticatedResponse,
			onConnectionWithServerChanged,
		})
	}, [error, sdk, onUnauthenticatedResponse, onConnectionWithServerChanged])

	return { error, ...rest } as UseSuspenseQueryResult<TResult>
}

type TVariablesWithPagination<T> = T extends Pagination ? T : never

export function useInfiniteGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	...[variables]: TVariables extends TVariablesWithPagination<TVariables> ? [] : [TVariables]
): UseSuspenseInfiniteQueryResult<InfiniteData<TResult>> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const [initialPageParam] = useState<Pagination>(() => variables?.pagination ?? undefined)

	const extractPageInfo = (lastPage: TResult) => {
		if (!lastPage || typeof lastPage !== 'object') {
			return undefined
		}
		// GraphQL response will embed the pageInfo in the selection being
		// paginated. This is a bit of a hack, but it works for now.
		const pageInfo = Object.values(lastPage).find(
			(value) => typeof value === 'object' && value !== null && 'pageInfo' in value,
		)?.pageInfo as PaginationInfo | undefined
		return pageInfo
	}

	const { error, ...rest } = useSuspenseInfiniteQuery({
		queryKey: ['foo-infinite'],
		queryFn: async ({ pageParam }) => {
			const response = await sdk.execute(document, { ...variables, pagination: pageParam })
			console.log('response', response)
			return response
		},
		initialPageParam,
		getNextPageParam: (lastPage, _) => getNextPageParam(extractPageInfo(lastPage)),
		experimental_prefetchInRender: true,
	})

	useEffect(() => {
		if (!error) return
		handleError({
			sdk,
			error,
			onUnauthenticatedResponse,
			onConnectionWithServerChanged,
		})
	}, [error, sdk, onUnauthenticatedResponse, onConnectionWithServerChanged])

	return {
		error,
		...rest,
	} as UseSuspenseInfiniteQueryResult<InfiniteData<TResult>>
}

export const getNextPageParam = (paginationInfo?: PaginationInfo): Pagination | undefined =>
	match(paginationInfo)
		.with({ __typename: 'CursorPaginationInfo' }, (info) => {
			if (!info.nextCursor) return undefined
			return {
				cursor: {
					after: info.nextCursor,
					limit: info.limit,
				},
			} satisfies Pagination
		})
		.with({ __typename: 'OffsetPaginationInfo' }, (info) => {
			const { currentPage, totalPages, zeroBased } = info
			const modifier = zeroBased ? 0 : 1
			const nextPage = currentPage + 1 + modifier
			if (nextPage > totalPages) return undefined
			return {
				offset: {
					page: nextPage,
					pageSize: info.pageSize,
					zeroBased: info.zeroBased,
				},
			} satisfies Pagination
		})
		.otherwise(() => undefined)
