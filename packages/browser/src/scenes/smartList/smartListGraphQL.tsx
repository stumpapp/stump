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

const query_smart_list_by_id = graphql(`
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

const query_smart_list_meta = graphql(`
	query SmartListMeta($id: ID!) {
		smartListMeta(id: $id) {
			matchedBooks
			matchedSeries
			matchedLibraries
		}
	}
`)

const mutation_smart_list_update = graphql(`
	mutation UpdateSmartList($id: ID!, $input: SaveSmartListInput!) {
		updateSmartList(id: $id, input: $input) {
			__typename
		}
	}
`)

const query_smart_list_items = graphql(`
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
						metadata {
							ageRating
							characters
							colorists
							coverArtists
							editors
							genres
							inkers
							letterers
							links
							pencillers
							publisher
							teams
							writers
							year
						}
					}
				}
			}
			... on SmartListUngrouped {
				books {
					...BookCard
					metadata {
						ageRating
						characters
						colorists
						coverArtists
						editors
						genres
						inkers
						letterers
						links
						pencillers
						publisher
						teams
						writers
						year
					}
				}
			}
		}
	}
`)

export function useSmartListItems({ id }: { id: string }) {
	const { sdk } = useSDK()
	const { data: { smartListItems: items } = {}, isLoading } = useGraphQL(
		query_smart_list_items,
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
						const response = await sdk.execute(query_smart_list_by_id, { id })
						return response
					},
					staleTime: PREFETCH_STALE_TIME,
				}),
				queryClient.prefetchQuery({
					queryKey: [sdk.cacheKeys.smartListMeta, id],
					queryFn: async () => {
						const response = await sdk.execute(query_smart_list_meta, { id })
						return response
					},
					staleTime: DEFAULT_META_CACHE_TIME,
				}),
				queryClient.prefetchQuery({
					queryKey: [sdk.cacheKeys.smartListItems, id],
					queryFn: async () => {
						const response = await sdk.execute(query_smart_list_items, { id })
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
	const { mutate } = useGraphQLMutation(mutation_smart_list_update, {
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

export function useSmartListById({ id }: { id: string }): {
	list?: SmartListParsed
	isLoading: boolean
} {
	const { sdk } = useSDK()
	const { data: { smartListById: listUnparsed } = {}, isLoading: isLoading } = useSuspenseGraphQL(
		query_smart_list_by_id,
		[sdk.cacheKeys.smartListById, id || ''],
		{
			id: id || '',
		},
	)

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

export function useSmartListMeta({ id, staleTime }: { id: string; staleTime?: number }): {
	meta: SmartListMetaQuery['smartListMeta']
	isLoading: boolean
} {
	const { sdk } = useSDK()
	const options = staleTime ? { staleTime } : {}
	const { data: { smartListMeta: meta } = {}, isLoading: isLoading } = useGraphQL(
		query_smart_list_meta,
		[sdk.cacheKeys.smartListMeta, id || ''],
		{
			id: id || '',
		},
		options,
	)

	return {
		meta,
		isLoading,
	}
}
