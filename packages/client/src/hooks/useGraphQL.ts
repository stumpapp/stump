import type { Pagination, PaginationInfo, TypedDocumentString } from '@stump/graphql'
import { Api } from '@stump/sdk'
import {
	InfiniteData,
	QueryKey,
	useQuery,
	type UseQueryResult,
	useSuspenseInfiniteQuery,
	UseSuspenseInfiniteQueryOptions,
	UseSuspenseInfiniteQueryResult,
	useSuspenseQuery,
	UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import { IStumpClientContext, useClientContext } from '@/context'
import { useSDK } from '@/sdk'

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
	queryKey: QueryKey,
	variables?: TVariables extends Record<string, never> ? never : TVariables,
): UseQueryResult<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const { error, ...rest } = useQuery({
		queryKey,
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
	queryKey: QueryKey,
	variables?: TVariables extends Record<string, never> ? never : TVariables,
): UseSuspenseQueryResult<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const { error, ...rest } = useSuspenseQuery({
		queryKey,
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

export function useInfiniteGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	queryKey: QueryKey,
	variables?: TVariables extends Record<string, never> ? never : TVariables,
	options?: Omit<
		UseSuspenseInfiniteQueryOptions<
			TResult,
			Error,
			TResult,
			TResult,
			readonly unknown[],
			Pagination
		>,
		'queryKey' | 'queryFn'
	>,
): UseSuspenseInfiniteQueryResult<InfiniteData<TResult>> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const [initialPageParam] = useState<Pagination>(() => extractInitialPageParam(variables))

	const constructVariables = useCallback(
		(pageParam: Pagination) =>
			({
				...variables,
				pagination: pageParam,
			}) as TVariables extends Record<string, never> ? never : TVariables,
		[variables],
	)

	const { error, ...rest } = useSuspenseInfiniteQuery({
		queryKey,
		queryFn: async ({ pageParam }) => {
			const response = await sdk.execute(document, constructVariables(pageParam))
			return response
		},
		initialPageParam,
		getNextPageParam: (lastPage) => getNextPageParam(extractPageInfo(lastPage)),
		experimental_prefetchInRender: true,
		...options,
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

const extractInitialPageParam = <TVariables>(variables: TVariables): Pagination => {
	if (typeof variables !== 'object' || !variables) return { cursor: { limit: 20 } }
	if ('pagination' in variables) {
		const pagination = variables.pagination as Pagination
		if (pagination) {
			return pagination
		}
	}
	return { cursor: { limit: 20 } }
}

export const extractPageInfo = (data: unknown): PaginationInfo | undefined => {
	if (!data || Array.isArray(data)) return undefined
	if (typeof data === 'object' && 'pageInfo' in data) {
		return data.pageInfo as PaginationInfo
	}

	// We need to recursively check each property of the object and any nested objects
	for (const key in data) {
		const value = data[key as keyof typeof data]
		if (typeof value === 'object' && value !== null) {
			const pageInfo = extractPageInfo(value)

			if (pageInfo) {
				return pageInfo
			}
		}
	}

	return undefined
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
