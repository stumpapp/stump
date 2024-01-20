import { smartListApi, smartListQueryKeys } from '@stump/api'
import {
	CreateOrUpdateSmartList,
	CreateOrUpdateSmartListView,
	GetSmartListsParams,
	SmartList,
	SmartListItems,
	SmartListMeta,
	SmartListRelationOptions,
} from '@stump/types'
import { useQueries, UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useCallback } from 'react'

import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'
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
	params?: SmartListRelationOptions
}
export function useSmartListWithMetaQuery({ id, params }: UseSmartListItemsWithMetaQuery) {
	const [listResult, metaResult] = useQueries({
		context: QueryClientContext,
		queries: [
			{
				queryFn: async () => {
					const { data } = await smartListApi.getSmartListById(id, params)
					return data
				},
				queryKey: [smartListQueryKeys.getSmartListById, id, params],
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

// TODO: different types!
type UseUpdateSmartListMutationOptions = {
	id: string
} & MutationOptions<SmartList, AxiosError, CreateOrUpdateSmartList>
export function useUpdateSmartListMutation({ id, ...options }: UseUpdateSmartListMutationOptions) {
	const { mutate, mutateAsync, isLoading, ...restReturn } = useMutation(
		[smartListQueryKeys.updateSmartList, id],
		async (updates: CreateOrUpdateSmartList) => {
			const { data } = await smartListApi.updateSmartList(id, updates)
			return data
		},
		options,
	)

	return {
		isMutating: isLoading,
		update: mutate,
		updateAsync: mutateAsync,
		...restReturn,
	}
}

type UseDeleteSmartListMutationOptions = MutationOptions<SmartList, AxiosError, string>
export function useDeleteSmartListMutation({
	onSuccess,
	...options
}: UseDeleteSmartListMutationOptions = {}) {
	const { mutate, mutateAsync, isLoading, ...restReturn } = useMutation(
		[smartListQueryKeys.deleteSmartList],
		async (id: string) => {
			const { data } = await smartListApi.deleteSmartList(id)
			return data
		},
		{
			onSuccess: async (...args) => {
				await queryClient.invalidateQueries([smartListQueryKeys.getSmartLists], {
					exact: false,
				})
				onSuccess?.(...args)
			},
			...options,
		},
	)

	return {
		delete: mutate,
		deleteAsync: mutateAsync,
		isDeleting: isLoading,
		...restReturn,
	}
}

type UseSmartListViesManagerParams = {
	listId: string
}
export function useSmartListViewsManager({ listId }: UseSmartListViesManagerParams) {
	const handleInvalidate = useCallback(
		() =>
			queryClient.invalidateQueries([smartListQueryKeys.getSmartListById, listId], {
				exact: false,
			}),
		[listId],
	)

	const { mutateAsync: createView, isLoading: isCreating } = useMutation(
		[smartListQueryKeys.createSmartListView, listId],
		async (params: CreateOrUpdateSmartListView) => {
			const { data } = await smartListApi.createSmartListView(listId, params)
			return data
		},
		{
			onSuccess: handleInvalidate,
		},
	)

	const { mutateAsync: updateView, isLoading: isUpdating } = useMutation(
		[smartListQueryKeys.updateSmartListView, listId],
		async ({ originalName, ...params }: CreateOrUpdateSmartListView & { originalName: string }) => {
			const { data } = await smartListApi.updateSmartListView(listId, originalName, params)
			return data
		},
		{
			onSuccess: handleInvalidate,
		},
	)

	return {
		createView,
		isCreating,
		isUpdating,
		updateView,
	}
}
