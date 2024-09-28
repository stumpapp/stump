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

import { useSDK } from '@/sdk'

import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'
import { QueryClientContext } from '../context'

type UseSmartListsQueryOptions = QueryOptions<SmartList[]> & {
	params?: GetSmartListsParams
}
export function useSmartListsQuery({ params, ...options }: UseSmartListsQueryOptions = {}) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.smartlist.keys.get, params],
		async () => sdk.smartlist.get(params),
		options,
	)

	return { lists: data, ...rest }
}

export const usePrefetchSmartList = ({ id }: { id: string }) => {
	const { sdk } = useSDK()
	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery([sdk.smartlist.keys.getByID, id], async () =>
				sdk.smartlist.getByID(id),
			),
		[sdk.smartlist, id],
	)
	return { prefetch }
}

// TODO: support params
type UseSmartListQueryOptions = QueryOptions<SmartList> & {
	id: string
}

export function useSmartListQuery({ id, ...options }: UseSmartListQueryOptions) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.smartlist.keys.getByID, id],
		async () => sdk.smartlist.getByID(id),
		options,
	)

	return { list: data, ...rest }
}

type UseSmartListMetaQueryOptions = QueryOptions<SmartListMeta> & {
	id: string
}

export function useSmartListMetaQuery({ id, ...options }: UseSmartListMetaQueryOptions) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.smartlist.keys.meta, id],
		async () => sdk.smartlist.meta(id),
		options,
	)

	return { meta: data, ...rest }
}

export const usePrefetchListItems = ({ id }: { id: string }) => {
	const { sdk } = useSDK()

	const prefetch = useCallback(
		() =>
			queryClient.prefetchQuery([sdk.smartlist.keys.items, id], async () =>
				sdk.smartlist.items(id),
			),
		[sdk.smartlist, id],
	)

	return { prefetch }
}

// TODO: grouping override params
// TODO: additional filter params (change the request to POST when those are provided)
type UseSmartListItemsQuery = QueryOptions<SmartListItems> & {
	id: string
}
export function useSmartListItemsQuery({ id, ...options }: UseSmartListItemsQuery) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.smartlist.keys.items, id],
		async () => sdk.smartlist.items(id),
		options,
	)

	return { items: data, ...rest }
}

type UseSmartListItemsWithMetaQuery = {
	id: string
	params?: SmartListRelationOptions
}
export function useSmartListWithMetaQuery({ id, params }: UseSmartListItemsWithMetaQuery) {
	const { sdk } = useSDK()
	const [listResult, metaResult] = useQueries({
		context: QueryClientContext,
		queries: [
			{
				queryFn: async () => sdk.smartlist.getByID(id, params),
				queryKey: [sdk.smartlist.keys.getByID, id, params],
			},
			{
				queryFn: async () => sdk.smartlist.meta(id),
				queryKey: [sdk.smartlist.keys.meta, id],
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
	const { sdk } = useSDK()
	const { mutate, mutateAsync, isLoading, ...restReturn } = useMutation(
		[sdk.smartlist.keys.update, id],
		async (updates: CreateOrUpdateSmartList) => sdk.smartlist.update(id, updates),
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
	const { sdk } = useSDK()
	const { mutate, mutateAsync, isLoading, ...restReturn } = useMutation(
		[sdk.smartlist.keys.delete],
		(id) => sdk.smartlist.delete(id),
		{
			onSuccess: async (...args) => {
				await queryClient.invalidateQueries([sdk.smartlist.keys.get], {
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
	const { sdk } = useSDK()
	const handleInvalidate = useCallback(
		() =>
			queryClient.invalidateQueries([sdk.smartlist.keys.getByID, listId], {
				exact: false,
			}),
		[listId, sdk.smartlist],
	)

	const { mutateAsync: createView, isLoading: isCreating } = useMutation(
		[sdk.smartlist.keys.createView, listId],
		async (params: CreateOrUpdateSmartListView) => sdk.smartlist.createView(listId, params),
		{
			onSuccess: handleInvalidate,
		},
	)

	const { mutateAsync: updateView, isLoading: isUpdating } = useMutation(
		[sdk.smartlist.keys.updateView, listId],
		async ({ originalName, ...params }: CreateOrUpdateSmartListView & { originalName: string }) =>
			sdk.smartlist.updateView(listId, originalName, params),
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
