import type { Pagination, PaginationInfo, TypedDocumentString } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { GraphQLWebsocketConnectEventHandlers } from '@stump/sdk/socket'
import {
	InfiniteData,
	QueryKey,
	useInfiniteQuery,
	UseInfiniteQueryOptions,
	UseInfiniteQueryResult,
	useMutation,
	UseMutationOptions,
	UseMutationResult,
	useQuery,
	useQueryClient,
	UseQueryOptions,
	type UseQueryResult,
	useSuspenseInfiniteQuery,
	UseSuspenseInfiniteQueryOptions,
	UseSuspenseInfiniteQueryResult,
	useSuspenseQueries,
	useSuspenseQuery,
	UseSuspenseQueryOptions,
	UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { AxiosRequestConfig, isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { match } from 'ts-pattern'

import { IStumpClientContext, useClientContext } from '../context'
import { useSDK } from '../sdk'

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
		sdk.tokens = undefined
		onUnauthenticatedResponse?.('/auth', error.response?.data)
	} else if (isNetworkError) {
		onConnectionWithServerChanged?.(false)
	}
}

export function usePrefetchGraphQL() {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const onError = useCallback(
		(error: unknown) => {
			handleError({
				sdk,
				error,
				onUnauthenticatedResponse,
				onConnectionWithServerChanged,
			})
		},
		[sdk, onUnauthenticatedResponse, onConnectionWithServerChanged],
	)

	const execute = useCallback(
		<TResult, TVariables>(
			document: TypedDocumentString<TResult, TVariables>,
			variables?: TVariables extends Record<string, never> ? never : TVariables,
		) => sdk.execute(document, variables),
		[sdk],
	)

	const client = useQueryClient()

	return { execute, client, onError }
}

export function useGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	queryKey: QueryKey,
	variables?: TVariables extends Record<string, never> ? never : TVariables,
	options?: Omit<UseQueryOptions<TResult, Error, TResult, QueryKey>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const { error, ...rest } = useQuery({
		queryKey,
		queryFn: async () => {
			const response = await sdk.execute(document, variables)
			return response
		},
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

	return { error, ...rest } as UseQueryResult<TResult>
}

type UseGraphQLMutationOptions<TResult, TVariables> = Omit<
	UseMutationOptions<
		TResult,
		unknown,
		TVariables extends Record<string, never> ? never : TVariables,
		unknown
	>,
	'mutationFn'
> & {
	config?: Pick<AxiosRequestConfig, 'onUploadProgress'>
}

export function useGraphQLMutation<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	{ config, ...options }: UseGraphQLMutationOptions<TResult, TVariables> = {},
) {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const mutationFn = useCallback(
		async (variables?: TVariables extends Record<string, never> ? never : TVariables) =>
			sdk.execute(document, variables),
		[sdk, document],
	)
	const { error, ...rest } = useMutation({
		...options,
		mutationFn,
		onError: (error, variables, context) => {
			handleError({
				sdk,
				error,
				onUnauthenticatedResponse,
				onConnectionWithServerChanged,
			})
			options?.onError?.(error, variables, context)
		},
	})

	return { error, ...rest } as UseMutationResult<
		TResult,
		unknown,
		TVariables extends Record<string, never> ? never : TVariables,
		unknown
	>
}
export function useSuspenseGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	queryKey: QueryKey,
	variables?: TVariables extends Record<string, never> ? never : TVariables,
	options?: Omit<
		UseSuspenseQueryOptions<TResult, Error, TResult, QueryKey>,
		'queryKey' | 'queryFn'
	>,
): UseSuspenseQueryResult<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const { error, ...rest } = useSuspenseQuery({
		queryKey,
		queryFn: async () => {
			const response = await sdk.execute(document, variables)
			return response
		},
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

	return { error, ...rest } as UseSuspenseQueryResult<TResult>
}

// TODO(graphql): Fix the type inference for query variables
/**
 * Executes multiple GraphQL queries in parallel using tanstack's useQueries
 *
 * @param queries Array of query configurations
 * @returns Results for each query in the same order
 */
export function useSuspenseGraphQLQueries<TQueries extends readonly unknown[]>(queries: {
	[TQueryIndex in keyof TQueries]: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		document: TypedDocumentString<TQueries[TQueryIndex], any>
		queryKey: QueryKey
		// @ts-expect-error: This is OK
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		variables?: TQueries[TQueryIndex]['document'] extends TypedDocumentString<any, infer TVar>
			? TVar extends Record<string, never>
				? never
				: TVar
			: never
		options?: Omit<
			UseQueryOptions<TQueries[TQueryIndex], Error, TQueries[TQueryIndex], QueryKey>,
			'queryKey' | 'queryFn'
		>
	}
}): { [TQueryIndex in keyof TQueries]: UseSuspenseQueryResult<TQueries[TQueryIndex], Error> } {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	type QueryConfig<T> = {
		queryKey: QueryKey
		queryFn: () => Promise<T>
	} & Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>

	const queryConfigs = queries.map(({ document, queryKey, variables, options }) => ({
		queryKey,
		queryFn: async () => {
			const response = await sdk.execute(document, variables)
			return response
		},
		...options,
	})) as { [TQueryIndex in keyof TQueries]: QueryConfig<TQueries[TQueryIndex]> }

	const results = useSuspenseQueries({ queries: queryConfigs }) as {
		[TQueryIndex in keyof TQueries]: UseSuspenseQueryResult<TQueries[TQueryIndex], Error>
	}

	useEffect(() => {
		results.forEach((result) => {
			if (result.error) {
				handleError({
					sdk,
					error: result.error,
					onUnauthenticatedResponse,
					onConnectionWithServerChanged,
				})
			}
		})
	}, [results, sdk, onUnauthenticatedResponse, onConnectionWithServerChanged])

	return results
}

export function useInfiniteSuspenseGraphQL<TResult, TVariables>(
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

export function useInfiniteGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	queryKey: QueryKey,
	variables?: TVariables extends Record<string, never> ? never : TVariables,
	options?: Omit<
		UseInfiniteQueryOptions<TResult, Error, TResult, TResult, readonly unknown[], Pagination>,
		'queryKey' | 'queryFn'
	>,
): UseInfiniteQueryResult<InfiniteData<TResult>> {
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

	const { error, ...rest } = useInfiniteQuery({
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
	} as UseInfiniteQueryResult<InfiniteData<TResult>>
}

/**
 * Extract the initial page param from the variables object, if any exist
 *
 * @param variables The variables object to extract the pagination info from
 * @returns The initial page param object, or undefined if not found
 */
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

/**
 * Extract the pagination info from an unknown object. This is primarily used to extract
 * the pagination params from a GraphQL result. It aims to be flexible enough to support
 * nested selections with pagination arguments (via recursion).
 *
 * @param data The object to extract the pagination info from
 * @returns The pagination info object, or undefined if not found
 */
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

/**
 * Get the next page param from the pagination info object. If the pagination info is not
 * present, or if there is no next page, this function will return undefined.
 *
 * @param paginationInfo The pagination info object returned from the GraphQL result
 * @returns A {@link Pagination} object that can be used to fetch the next page of results
 */
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

export type GraphQLSubscriptionLifecycleParams = {
	onConnected?: (event: Event) => void
	onDisconnected?: (event: CloseEvent) => void
}

export type UseGraphQLSubscriptionCacheParams<TResult, TVariables> = {
	variables?: TVariables extends Record<string, never> ? never : TVariables
	/**
	 * An optional function that is called when the data changes to override how the hook
	 * manages its internal state.
	 */
	onDataChangeCapture?: (oldData: TResult[], newData: TResult) => TResult[]
	/**
	 * The maximum number of items to keep in the cache. If not provided, the default is 10,000.
	 */
	maxCacheSize?: number
} & GraphQLSubscriptionLifecycleParams

export type UseGraphQLSubscriptionCacheReturn<TResult> = [
	TResult[] | undefined,
	WebSocket | null,
	() => void,
]

export function useGraphQLSubscriptionCache<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	{
		variables,
		onDataChangeCapture,
		maxCacheSize = 10_000,
		...params
	}: UseGraphQLSubscriptionCacheParams<TResult, TVariables> = {},
): UseGraphQLSubscriptionCacheReturn<TResult> {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const [socket, setSocket] = useState<WebSocket | null>(null)
	const [dispose, setDispose] = useState<() => void>(() => () => {})

	const [data, setData] = useState<TResult[] | undefined>(undefined)

	if (maxCacheSize <= 10) {
		throw new Error('maxCacheSize must be greater than 10')
	}

	const events = useMemo<Partial<GraphQLWebsocketConnectEventHandlers<TResult>>>(
		() => ({
			onMessage: (payload) => {
				setData((prevData) => {
					if (onDataChangeCapture) {
						return onDataChangeCapture(prevData || [], payload)
					} else {
						const newData = [...(prevData || []), payload]
						if (newData.length > maxCacheSize) {
							return newData.slice(newData.length - maxCacheSize)
						}
						return newData
					}
				})
			},
			onError: (error) => {
				handleError({
					sdk,
					error,
					onUnauthenticatedResponse,
					onConnectionWithServerChanged,
				})
			},
			onOpen: (ev) => params?.onConnected?.(ev),
			onClose: (ev) => params?.onDisconnected?.(ev),
		}),
		[
			sdk,
			onUnauthenticatedResponse,
			onConnectionWithServerChanged,
			onDataChangeCapture,
			maxCacheSize,
			params,
		],
	)

	const didConfigure = useRef(false)
	/**
	 * An effect responsible for kicking off the socket connection and managing the
	 * lifecycle of the socket. It will only run once, and will clean up the socket when
	 * the component unmounts or when the socket is closed.
	 */
	useEffect(() => {
		if (socket || didConfigure.current) return

		didConfigure.current = true
		const configureSocket = async () => {
			const { socket, unsubscribe } = await sdk.connect<TResult, TVariables>(
				document,
				variables,
				events,
			)

			setSocket(socket)
			setDispose(() => () => {
				unsubscribe()
				socket.close()
				setSocket(null)
				didConfigure.current = false
			})
		}

		configureSocket()

		return () => {
			dispose()
		}
	}, [socket, sdk, document, variables, events, dispose])

	return [data, socket, dispose] as const
}

// TODO: Consolidate the socket logic
// TODO: Add socket lifecycle callback options (e.g., onconnect, onclose, etc)

export type UseGraphQLSubscriptionParams<TResult, TVariables> = {
	variables?: TVariables extends Record<string, never> ? never : TVariables
	/**
	 * An optional function that is called when a new message is received
	 */
	onMessage?: (payload: TResult) => void
} & GraphQLSubscriptionLifecycleParams

export type UseGraphQLSubscriptionReturn = [WebSocket | null, () => void]

export function useGraphQLSubscription<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	{ variables, onMessage, ...params }: UseGraphQLSubscriptionParams<TResult, TVariables> = {},
): UseGraphQLSubscriptionReturn {
	const { sdk } = useSDK()
	const { onUnauthenticatedResponse, onConnectionWithServerChanged } = useClientContext()

	const [socket, setSocket] = useState<WebSocket | null>(null)
	const [dispose, setDispose] = useState<() => void>(() => () => {})

	const events = useMemo<Partial<GraphQLWebsocketConnectEventHandlers<TResult>>>(
		() => ({
			onMessage: (payload) => {
				onMessage?.(payload)
			},
			onError: (error) => {
				handleError({
					sdk,
					error,
					onUnauthenticatedResponse,
					onConnectionWithServerChanged,
				})
			},
			onOpen: (ev) => params?.onConnected?.(ev),
			onClose: (ev) => params?.onDisconnected?.(ev),
		}),
		[sdk, onUnauthenticatedResponse, onConnectionWithServerChanged, onMessage, params],
	)

	const didConfigure = useRef(false)
	/**
	 * An effect responsible for kicking off the socket connection and managing the
	 * lifecycle of the socket. It will only run once, and will clean up the socket when
	 * the component unmounts or when the socket is closed.
	 */
	useEffect(() => {
		if (socket || didConfigure.current) return

		didConfigure.current = true
		const configureSocket = async () => {
			const { socket, unsubscribe } = await sdk.connect<TResult, TVariables>(
				document,
				variables,
				events,
			)

			setSocket(socket)
			setDispose(() => () => {
				unsubscribe()
				socket.close()
				setSocket(null)
				didConfigure.current = false
			})
		}

		configureSocket()

		return () => {
			dispose()
		}
	}, [socket, sdk, document, variables, events, dispose])

	return [socket, dispose] as const
}
