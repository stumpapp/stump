import type {
	CreateLibrary,
	Library,
	LibraryFilter,
	LibraryStats,
	LibraryStatsParams,
	PaginationQuery,
	UpdateLibrary,
	User,
} from '@stump/types'
import { AxiosError } from 'axios'

import {
	MutationOptions,
	PageQueryOptions,
	QueryOptions,
	useMutation,
	usePageQuery,
	useQuery,
} from '../client'
import { invalidateQueries } from '../invalidate'
import { useSDK } from '../sdk'

export const useRefreshLibrary = (id: string) => {
	const { sdk } = useSDK()

	const refreshCache = invalidateQueries({
		queryKey: [sdk.library.keys.getByID, id],
	})

	return { refreshCache }
}

export function useLibraryByID(id: string, options?: QueryOptions<Library>) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.library.keys.getByID, id],
		() => sdk.library.getByID(id),
		options,
	)

	return { library: data, ...rest }
}

type UseLibraryQueryOptions = QueryOptions<Library | undefined> & {
	params?: LibraryFilter & PaginationQuery
}

export function useLibraryQuery({ params, ...options }: UseLibraryQueryOptions = {}) {
	const { sdk } = useSDK()
	const { data: library, ...restReturn } = useQuery(
		[sdk.library.get, params],
		async () => {
			const { data } = await sdk.library.get({ ...params, limit: 1 })
			return data.at(0)
		},
		options,
	)

	return { library, ...restReturn }
}

export function useLibraries(options: PageQueryOptions<Library> = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = usePageQuery(
		[sdk.library.keys.get, options],
		(params) => sdk.library.get(params),
		{
			keepPreviousData: true,
			// Send all non-401 errors to the error page
			useErrorBoundary: (err: AxiosError) => !err || (err.response?.status ?? 500) !== 401,
			...options,
		},
	)

	const libraries = data?.data
	const pageData = data?._page

	return {
		libraries,
		pageData,
		...restReturn,
	}
}

export function useTotalLibraryStats() {
	const { sdk } = useSDK()
	const {
		data: libraryStats,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery([sdk.library.keys.getStats], () => sdk.library.getStats())

	return { isLoading: isLoading || isRefetching || isFetching, libraryStats }
}

export function useLibraryStats({
	id,
	params,
	...options
}: QueryOptions<LibraryStats> & { id: string; params?: LibraryStatsParams }) {
	const { sdk } = useSDK()
	const { data: stats, ...rest } = useQuery(
		[sdk.library.keys.getStats, id, params],
		async () => sdk.library.getStats({ id, ...params }),
		options,
	)

	return { stats, ...rest }
}

export function useScanLibrary() {
	const { sdk } = useSDK()
	const { mutate: scan, mutateAsync: scanAsync } = useMutation(
		[sdk.library.keys.scan],
		(id: string) => sdk.library.scan(id),
	)

	return { scan, scanAsync }
}

export function useCreateLibraryMutation(
	options: MutationOptions<Library, AxiosError, CreateLibrary> = {},
) {
	const { sdk } = useSDK()
	const {
		mutate: createLibrary,
		mutateAsync: createLibraryAsync,
		...rest
	} = useMutation([sdk.library.keys.create], (payload) => sdk.library.create(payload), {
		...options,
		onSuccess: async (library, _, __) => {
			await invalidateQueries({
				keys: [sdk.library.keys.get, sdk.library.keys.getStats, sdk.job.keys.get],
			})
			options.onSuccess?.(library, _, __)
		},
	})

	return { createLibrary, createLibraryAsync, ...rest }
}

export function useUpdateLibrary({
	id,
	...options
}: MutationOptions<Library, AxiosError, UpdateLibrary> & { id: string }) {
	const { sdk } = useSDK()
	const {
		mutate: editLibrary,
		mutateAsync: editLibraryAsync,
		...rest
	} = useMutation([sdk.library.keys.update], (params) => sdk.library.update(id, params), {
		...options,
		onSuccess: async (library, _, __) => {
			await invalidateQueries({
				exact: false,
				keys: [
					sdk.library.keys.get,
					sdk.library.keys.getStats,
					sdk.job.keys.get,
					sdk.library.keys.getByID,
				],
			})
			options.onSuccess?.(library, _, __)
		},
	})

	return { editLibrary, editLibraryAsync, ...rest }
}

export function useDeleteLibrary(options: MutationOptions<Library, AxiosError, string> = {}) {
	const { sdk } = useSDK()
	const {
		mutate: deleteLibrary,
		mutateAsync: deleteLibraryAsync,
		...rest
	} = useMutation([sdk.library.keys.delete], (id) => sdk.library.delete(id), {
		...options,
		onSuccess: async (library, _, __) => {
			await invalidateQueries({
				keys: [sdk.library.keys.get, sdk.library.keys.getStats],
			})
			options.onSuccess?.(library, _, __)
		},
	})

	return { deleteLibrary, deleteLibraryAsync, ...rest }
}

export function useVisitLibrary(options: MutationOptions<Library, AxiosError, string> = {}) {
	const { sdk } = useSDK()
	const {
		mutate: visitLibrary,
		mutateAsync: visitLibraryAsync,
		...rest
	} = useMutation([sdk.library.keys.visit], (id) => sdk.library.visit(id), {
		...options,
		onSuccess: async (library, _, __) => {
			await invalidateQueries({
				keys: [sdk.library.keys.getLastVisited],
			})
			options.onSuccess?.(library, _, __)
		},
	})

	return { visitLibrary, visitLibraryAsync, ...rest }
}

export function useLibraryExclusions({ id, ...options }: QueryOptions<User[]> & { id: string }) {
	const { sdk } = useSDK()
	const { data: excludedUsers, ...rest } = useQuery(
		[sdk.library.keys.excludedUsers, id],
		() => sdk.library.excludedUsers(id),
		options,
	)

	return { excludedUsers, ...rest }
}

export function useUpdateLibraryExclusions({
	id,
	...options
}: MutationOptions<Library, AxiosError, string[]> & { id: string }) {
	const { sdk } = useSDK()
	const {
		mutate: updateExcludedUsers,
		mutateAsync: updateExcludedUsersAsync,
		...rest
	} = useMutation(
		[sdk.library.keys.updateExcludedUsers],
		async (userIds) => sdk.library.updateExcludedUsers(id, { user_ids: userIds }),
		{
			...options,
			onSuccess: async (users, _, __) => {
				await invalidateQueries({
					keys: [sdk.library.keys.excludedUsers],
				})
				options.onSuccess?.(users, _, __)
			},
		},
	)

	return { updateExcludedUsers, updateExcludedUsersAsync, ...rest }
}
