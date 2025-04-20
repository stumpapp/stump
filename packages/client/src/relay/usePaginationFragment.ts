import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefetchFnDynamic, useRefetchableFragment } from 'react-relay'
import { KeyType, KeyTypeData } from 'react-relay/relay-hooks/helpers'
import {
	getFragment,
	getFragmentIdentifier,
	GraphQLTaggedNode,
	OperationType,
	VariablesOf,
} from 'relay-runtime'
import { match } from 'ts-pattern'

type LoadMoreFn<TQuery extends OperationType> = (options?: {
	onComplete?: ((arg: Error | null) => void) | undefined
	UNSTABLE_extraVariables?: Partial<VariablesOf<TQuery>> | undefined
}) => Disposable

export interface usePaginationFragmentHookType<
	TQuery extends OperationType,
	TKey extends KeyType | null | undefined,
	TFragmentData,
> {
	data: TFragmentData
	loadNext: LoadMoreFn<TQuery>
	loadPrevious: LoadMoreFn<TQuery>
	hasNext: boolean
	hasPrevious: boolean
	isLoadingNext: boolean
	isLoadingPrevious: boolean
	refetch: RefetchFnDynamic<TQuery, TKey>
}

type CursorPaginationInfo = {
	__typename: 'CursorPaginationInfo'
	currentCursor: string
	nextCursor?: string
}

type OffsetPaginationInfo = {
	__typename: 'OffsetPaginationInfo'
	totalPages: number
	currentPage: number
	pageSize: number
	pageOffset: number
	zeroBased: boolean
}

type PaginationInfo = CursorPaginationInfo | OffsetPaginationInfo

type CursorCacheItem = {
	nextCursor?: string
	previousCursor?: string
}

type CursorCache = {
	[currentCursor: string]: CursorCacheItem
}

export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
	fragmentInput: GraphQLTaggedNode,
	parentFragmentRef: TKey,
): usePaginationFragmentHookType<TQuery, TKey, KeyTypeData<TKey>> {
	const fragmentNode = getFragment(fragmentInput)
	const fragmentId = getFragmentIdentifier(fragmentNode, parentFragmentRef)

	const [data, refetch] = useRefetchableFragment<TQuery, TKey>(fragmentInput, parentFragmentRef)

	const [isLoadingNext, setIsLoadingNext] = useState(false)
	const [isLoadingPrevious, setIsLoadingPrevious] = useState(false)

	const [cursorCache, setCursorCache] = useState<CursorCache>({})

	console.log('data', data)

	const paginationData = useMemo(() => extractPaginationInfo(data), [data])

	useEffect(() => {
		if (paginationData.__typename === 'CursorPaginationInfo') {
			const { currentCursor, nextCursor } = paginationData
			if (currentCursor && nextCursor) {
				setCursorCache((prevCache) => ({
					...prevCache,
					[currentCursor]: {
						nextCursor,
						previousCursor: prevCache[currentCursor]?.previousCursor,
					},
				}))
			}
		}
	}, [paginationData])

	const calculatePageAvailability = useCallback(
		(paginationInfo: PaginationInfo) =>
			match(paginationInfo)
				.with({ __typename: 'CursorPaginationInfo' }, (info) => ({
					hasNext: !!info.nextCursor,
					hasPrevious: cursorCache[info.currentCursor]?.previousCursor != undefined,
				}))
				.with({ __typename: 'OffsetPaginationInfo' }, (info) => {
					const { currentPage, totalPages, zeroBased } = info
					const adjustedCurrent = zeroBased ? currentPage + 1 : currentPage
					return {
						hasNext: adjustedCurrent < totalPages,
						hasPrevious: zeroBased ? currentPage > 0 : currentPage > 1,
					}
				})
				.with(
					{
						// @ts-expect-error: This is not valid per the type, but is a valid case if the fragment
						// does not include the __typename. Without this, the match would flow through to the exhaustive
						// block and throw a generic error
						__typename: undefined,
					},
					() => {
						throw new Error(
							'The __typename is not present. Be sure to select it as part of the fragment.',
						)
					},
				)
				.exhaustive(),
		[paginationData],
	)

	const buildNextPageVariables = useCallback(
		(paginationInfo: PaginationInfo) => {
			if (paginationInfo.__typename === 'CursorPaginationInfo') {
				return {
					cursor: paginationInfo.nextCursor,
				}
			} else {
				const nextPage = paginationInfo.zeroBased
					? paginationInfo.currentPage + 1
					: paginationInfo.currentPage + 1
				return {
					page: nextPage,
					pageSize: paginationInfo.pageSize,
				}
			}
		},
		[paginationData],
	)

	const buildPreviousPageVariables = useCallback(
		(paginationInfo: PaginationInfo) => {
			if (paginationInfo.__typename === 'CursorPaginationInfo') {
				const previousCursor = cursorCache[paginationInfo.currentCursor]?.previousCursor
				if (!previousCursor) {
					throw new Error('No previous cursor found in cache')
				}
				return {
					cursor: previousCursor,
				}
			} else {
				const prevPage = paginationInfo.zeroBased
					? Math.max(0, paginationInfo.currentPage - 1)
					: Math.max(1, paginationInfo.currentPage - 1)
				return {
					page: prevPage,
					pageSize: paginationInfo.pageSize,
				}
			}
		},
		[paginationData],
	)

	const { hasNext, hasPrevious } = calculatePageAvailability(paginationData)

	const loadNext: LoadMoreFn<TQuery> = useCallback(
		(options) => {
			setIsLoadingNext(true)

			const variables = buildNextPageVariables(paginationData)

			// Store the fragment identifier before the update

			const disposable = refetch(variables, {
				onComplete: (error) => {
					setIsLoadingNext(false)
					options?.onComplete?.(error)
				},

				// Use updater function to append nodes instead of replacing
				// updater: (store) => {
				// 	// Get the new fragment record
				// 	const newRecord = store.get(fragmentId)
				// 	if (!newRecord) return

				// 	// Find the connection in the record (could be at root or nested)
				// 	const rootFields = newRecord.getLinkedRecords(Object.keys(data)[0])
				// 	if (!rootFields || rootFields.length === 0) return

				// 	const connectionRecord = rootFields[0] // Assuming first field is our connection

				// 	// Get existing nodes
				// 	const existingNodes = connectionRecord.getLinkedRecords('nodes') || []

				// 	// Get new nodes from the response
				// 	const newNodes =
				// 		store
				// 			.getRootField('response')
				// 			?.getLinkedRecord(Object.keys(data)[0])
				// 			?.getLinkedRecords('nodes') || []

				// 	// Combine existing and new nodes
				// 	connectionRecord.setLinkedRecords([...existingNodes, ...newNodes], 'nodes')

				// 	// Update pageInfo
				// 	const newPageInfo = store
				// 		.getRootField('response')
				// 		?.getLinkedRecord(Object.keys(data)[0])
				// 		?.getLinkedRecord('pageInfo')

				// 	if (newPageInfo) {
				// 		connectionRecord.setLinkedRecord(newPageInfo, 'pageInfo')
				// 	}
				// },
			})

			return {
				[Symbol.dispose]: function () {
					disposable.dispose()
				},
			}
		},
		[paginationData, refetch],
	)

	const loadPrevious: LoadMoreFn<TQuery> = useCallback(
		(options) => {
			setIsLoadingPrevious(true)

			const variables = buildPreviousPageVariables(paginationData)

			const disposable = refetch(variables, {
				onComplete: (error) => {
					setIsLoadingPrevious(false)
					options?.onComplete?.(error)
				},
			})

			return {
				[Symbol.dispose]: function () {
					disposable.dispose()
				},
			}
		},
		[paginationData, refetch],
	)

	return {
		data,
		loadNext,
		loadPrevious,
		hasNext,
		hasPrevious,
		isLoadingNext,
		isLoadingPrevious,
		refetch,
	}
}

// Extract pagination info from the fragment data
function extractPaginationInfo(data: any): PaginationInfo {
	// The root will be the selection, so we need to get the first selection
	const rootSelection = Object.values(data)[0] as any
	const paginationInfo = rootSelection?.pageInfo
	if (!paginationInfo) {
		throw new Error('No pagination info found in the fragment data')
	}

	return paginationInfo
}
