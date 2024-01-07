import { smartListApi, smartListQueryKeys } from '@stump/api'
import { GetSmartListsParams, SmartList, SmartListItems, SmartListMeta } from '@stump/types'
import { useQueries, UseQueryResult } from '@tanstack/react-query'

import { queryClient, QueryOptions, useQuery } from '../client'
import { QueryClientContext } from '../context'

type UseBookClubsQueryOptions = QueryOptions<SmartList[]> & {
	params?: GetSmartListsParams
}
export function useSmartListsQuery({ params, ...options }: UseBookClubsQueryOptions = {}) {
	const { data, ...rest } = useQuery(
		[smartListQueryKeys.getSmartLists, params],
		async () => {
			const { data } = await smartListApi.getSmartLists(params)
			return data
		},
		options,
	)

	return { lists: data, ...rest }
}

export const prefetchSmartList = (id: string) =>
	queryClient.prefetchQuery([smartListQueryKeys.getSmartListById, id], async () => {
		const { data } = await smartListApi.getSmartListById(id)
		return data
	})

// TODO: support params
type UseSmartListQueryOptions = QueryOptions<SmartList> & {
	id: string
}

export function useSmartListQuery({ id, ...options }: UseSmartListQueryOptions) {
	const { data, ...rest } = useQuery(
		[smartListQueryKeys.getSmartListById, id],
		async () => {
			const { data } = await smartListApi.getSmartListById(id)
			return data
		},
		options,
	)

	return { list: data, ...rest }
}

type UseSmartListMetaQueryOptions = QueryOptions<SmartListMeta> & {
	id: string
}

export function useSmartListMetaQuery({ id, ...options }: UseSmartListMetaQueryOptions) {
	const { data, ...rest } = useQuery(
		[smartListQueryKeys.getSmartListMeta, id],
		async () => {
			const { data } = await smartListApi.getSmartListMeta(id)
			return data
		},
		options,
	)

	return { meta: data, ...rest }
}

export const prefetchSmartListItems = (id: string) =>
	queryClient.prefetchQuery([smartListQueryKeys.getSmartListItems, id], async () => {
		const { data } = await smartListApi.getSmartListItems(id)
		return data
	})

// TODO: grouping override params
// TODO: additional filter params (change the request to POST when those are provided)
type UseSmartListItemsQuery = QueryOptions<SmartListItems> & {
	id: string
}
export function useSmartListItemsQuery({ id, ...options }: UseSmartListItemsQuery) {
	const { data, ...rest } = useQuery(
		[smartListQueryKeys.getSmartListItems, id],
		async () => {
			const { data } = await smartListApi.getSmartListItems(id)
			return data
		},
		options,
	)

	return { items: data, ...rest }
}

type UseSmartListItemsWithMetaQuery = {
	id: string
}
export function useSmartListWithMetaQuery({ id }: UseSmartListItemsWithMetaQuery) {
	const [listResult, metaResult] = useQueries({
		context: QueryClientContext,
		queries: [
			{
				queryFn: async () => {
					const { data } = await smartListApi.getSmartListById(id)
					return data
				},
				queryKey: [smartListQueryKeys.getSmartListById, id],
			},
			{
				queryFn: async () => {
					const { data } = await smartListApi.getSmartListMeta(id)
					return data
				},
				queryKey: [smartListQueryKeys.getSmartListMeta, id],
			},
		],
	})

	const { data: list, ...listQuery } = listResult ?? ({} as UseQueryResult<SmartList>)
	const { data: meta, ...metaQuery } = metaResult ?? ({} as UseQueryResult<SmartListMeta>)

	return {
		list,
		listQuery,
		meta,
		metaQuery,
	}
}
