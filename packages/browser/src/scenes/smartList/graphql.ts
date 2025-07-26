import {
	PREFETCH_STALE_TIME,
	queryClient,
	useGraphQL,
	useGraphQLMutation,
	useSDK,
	useSuspenseGraphQL,
} from '@stump/client'
import {
	graphql,
	SaveSmartListInput,
	SmartList,
	SmartListFilterGroupInput,
	SmartListMetaQuery,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
export type SmartListParsed = Omit<SmartList, 'filters'> & {
	filters: Array<SmartListFilterGroupInput>
}

export const DEFAULT_META_CACHE_TIME = 1000 * 60 * 15 // 15 minutes

const listByIdQuery = graphql(`
	query SmartListById($id: ID!) {
		smartListById(id: $id) {
			id
			creatorId
			description
			defaultGrouping
			filters
			joiner
			name
			visibility
			views {
				id
				listId
				name
				bookColumns {
					id
					position
				}
				bookSorting {
					id
					desc
				}
				groupColumns {
					id
					position
				}
				groupSorting {
					id
					desc
				}
			}
		}
	}
`)

const smartListMetaQuery = graphql(`
	query SmartListMeta($id: ID!) {
		smartListMeta(id: $id) {
			matchedBooks
			matchedSeries
			matchedLibraries
		}
	}
`)

const smartListUpdateMutation = graphql(`
	mutation UpdateSmartList($id: ID!, $input: SaveSmartListInput!) {
		updateSmartList(id: $id, input: $input) {
			__typename
		}
	}
`)

const smartListItemsQuery = graphql(`
	query SmartListItems($id: ID!) {
		smartListItems(id: $id) {
			__typename
			... on SmartListGrouped {
				items {
					entity {
						__typename
						... on Series {
							id
							name
						}
						... on Library {
							id
							name
						}
					}
					books {
						...BookCard
						...BookMetadata
					}
				}
			}
			... on SmartListUngrouped {
				books {
					...BookCard
					...BookMetadata
				}
			}
		}
	}
`)

export function useSmartListItems({ id }: { id: string }) {
	const { sdk } = useSDK()
	const { data: { smartListItems: items } = {}, isLoading } = useGraphQL(
		smartListItemsQuery,
		[sdk.cacheKeys.smartListItems, id],
		{
			id: id || '',
		},
	)

	return {
		items,
		isLoading,
	}
}

export function usePrefetchSmartList() {
	const { sdk } = useSDK()
	const prefetch = useCallback(
		({ id }: { id: string }) => {
			Promise.all([
				queryClient.prefetchQuery({
					queryKey: [sdk.cacheKeys.smartListById, id],
					queryFn: async () => {
						const response = await sdk.execute(listByIdQuery, { id })
						return response
					},
					staleTime: PREFETCH_STALE_TIME,
				}),
				queryClient.prefetchQuery({
					queryKey: [sdk.cacheKeys.smartListMeta, id],
					queryFn: async () => {
						const response = await sdk.execute(smartListMetaQuery, { id })
						return response
					},
					staleTime: DEFAULT_META_CACHE_TIME,
				}),
				queryClient.prefetchQuery({
					queryKey: [sdk.cacheKeys.smartListItems, id],
					queryFn: async () => {
						const response = await sdk.execute(smartListItemsQuery, { id })
						return response
					},
					staleTime: PREFETCH_STALE_TIME,
				}),
			])
		},
		[sdk],
	)

	return { prefetch }
}

export function useUpdateSmartList({ id, list }: { id: string; list?: SmartListParsed }): {
	update: (updates: Partial<SaveSmartListInput>) => Promise<void>
} {
	const { sdk } = useSDK()
	const listWithoutFields = useMemo(() => {
		const listWithoutFields = {
			...(list || {}),
		}
		delete listWithoutFields.id
		delete listWithoutFields.creatorId
		delete listWithoutFields.views
		return listWithoutFields
	}, [list])

	const client = useQueryClient()
	const { mutate } = useGraphQLMutation(smartListUpdateMutation, {
		mutationKey: [sdk.cacheKeys.smartListUpdate, id],
		onSuccess: () => {
			client.invalidateQueries({ queryKey: [sdk.cacheKeys.smartListById, id || ''] })
		},
	})
	const update = useCallback(
		async (updates: Partial<SaveSmartListInput>) => {
			mutate({ id, input: { ...listWithoutFields, ...updates } as SaveSmartListInput })
		},
		[mutate, id, listWithoutFields],
	)

	return {
		update,
	}
}

type UseSmartListByIdParams = {
	id: string
}

type UseSmartListByIdReturn = {
	list?: SmartListParsed
	isLoading: boolean
}

export function useSmartListById({ id }: UseSmartListByIdParams): UseSmartListByIdReturn {
	const { sdk } = useSDK()
	const { data: { smartListById: listUnparsed } = {}, isLoading: isLoading } = useSuspenseGraphQL(
		listByIdQuery,
		[sdk.cacheKeys.smartListById, id || ''],
		{
			id: id || '',
		},
	)

	// TODO(graphql): wrap in try/catch to handle parse errors
	const list = useMemo(() => {
		if (listUnparsed) {
			const filtersFromJson = JSON.parse(listUnparsed.filters) as Array<SmartListFilterGroupInput>
			return { ...listUnparsed, filters: filtersFromJson } as SmartListParsed
		} else {
			return undefined
		}
	}, [listUnparsed])

	return {
		list,
		isLoading,
	}
}

type UseSmartListMetaParams = {
	id: string
	staleTime?: number
}

type UseSmartListMetaReturn = {
	meta?: SmartListMetaQuery['smartListMeta']
	isLoading: boolean
}

export function useSmartListMeta({
	id,
	staleTime,
}: UseSmartListMetaParams): UseSmartListMetaReturn {
	const { sdk } = useSDK()
	const options = staleTime ? { staleTime } : {}
	const { data: { smartListMeta: meta } = {}, isLoading: isLoading } = useGraphQL(
		smartListMetaQuery,
		[sdk.cacheKeys.smartListMeta, id || ''],
		{
			id: id || '',
		},
		{ ...options, enabled: !!id },
	)

	return {
		meta,
		isLoading,
	}
}
