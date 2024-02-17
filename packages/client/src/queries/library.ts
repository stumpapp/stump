import { jobQueryKeys, libraryApi, libraryQueryKeys } from '@stump/api'
import type {
	CreateLibrary,
	Library,
	LibraryStats,
	LibraryStatsParams,
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

export const refreshUseLibrary = (id: string) =>
	invalidateQueries({ exact: true, queryKey: [libraryQueryKeys.getLibraryById, id] })

export function useLibraryByIdQuery(id: string, options?: QueryOptions<Library>) {
	const { data, ...rest } = useQuery(
		[libraryQueryKeys.getLibraryById, id],
		() => libraryApi.getLibraryById(id).then((res) => res.data),
		options,
	)

	return { library: data, ...rest }
}

type UseLibraryQueryOptions = QueryOptions<Library | undefined> & {
	params?: Record<string, unknown>
}
export function useLibraryQuery({ params, ...options }: UseLibraryQueryOptions = {}) {
	const { data: library, ...restReturn } = useQuery(
		[libraryQueryKeys.getLibraries, params],
		async () => {
			const { data } = await libraryApi.getLibraries(params)
			return data?.data?.at(0)
		},
		options,
	)

	return { library, ...restReturn }
}

export function useLibraries(options: PageQueryOptions<Library> = {}) {
	const { data, ...restReturn } = usePageQuery(
		[libraryQueryKeys.getLibraries, options],
		async () => {
			const { data } = await libraryApi.getLibraries()
			return data
		},
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
	const {
		data: libraryStats,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery([libraryQueryKeys.getLibraryStats], () =>
		libraryApi.getTotalLibraryStats().then((data) => data.data),
	)

	return { isLoading: isLoading || isRefetching || isFetching, libraryStats }
}

export function useLibraryStats({
	id,
	params,
	...options
}: QueryOptions<LibraryStats> & { id: string; params?: LibraryStatsParams }) {
	const { data: stats, ...rest } = useQuery(
		[libraryQueryKeys.getLibraryStats, id, params],
		async () => {
			const { data } = await libraryApi.getLibraryStats(id, params)
			return data
		},
		options,
	)

	return { stats, ...rest }
}

// TODO: fix type error :grimacing:
export function useScanLibrary({ onError }: Pick<QueryOptions<unknown>, 'onError'> = {}) {
	const { mutate: scan, mutateAsync: scanAsync } = useMutation(
		[libraryQueryKeys.scanLibary],
		libraryApi.scanLibary,
		{
			onError,
		},
	)

	return { scan, scanAsync }
}

export function useCreateLibraryMutation(
	options: MutationOptions<Library, AxiosError, CreateLibrary> = {},
) {
	const {
		mutate: createLibrary,
		mutateAsync: createLibraryAsync,
		...rest
	} = useMutation(
		[libraryQueryKeys.createLibrary],
		async (variables) => {
			const { data } = await libraryApi.createLibrary(variables)
			return data
		},
		{
			...options,
			onSuccess: async (library, _, __) => {
				await invalidateQueries({
					keys: [
						libraryQueryKeys.getLibraries,
						libraryQueryKeys.getLibraryStats,
						jobQueryKeys.getJobs,
					],
				})
				options.onSuccess?.(library, _, __)
			},
		},
	)

	return { createLibrary, createLibraryAsync, ...rest }
}

export function useEditLibraryMutation(
	options: MutationOptions<Library, AxiosError, UpdateLibrary> = {},
) {
	const {
		mutate: editLibrary,
		mutateAsync: editLibraryAsync,
		...rest
	} = useMutation(
		[libraryQueryKeys.editLibrary],
		async (variables) => {
			const { data } = await libraryApi.editLibrary(variables)
			return data
		},
		{
			...options,
			onSuccess: async (library, _, __) => {
				await invalidateQueries({
					keys: [
						libraryQueryKeys.getLibraries,
						libraryQueryKeys.getLibraryStats,
						jobQueryKeys.getJobs,
					],
				})
				options.onSuccess?.(library, _, __)
			},
		},
	)

	return { editLibrary, editLibraryAsync, ...rest }
}

export function useDeleteLibraryMutation(
	options: MutationOptions<Library, AxiosError, string> = {},
) {
	const {
		mutate: deleteLibrary,
		mutateAsync: deleteLibraryAsync,
		...rest
	} = useMutation(
		[libraryQueryKeys.deleteLibrary],
		async (id) => {
			const { data } = await libraryApi.deleteLibrary(id)
			return data
		},
		{
			...options,
			onSuccess: async (library, _, __) => {
				await invalidateQueries({
					keys: [libraryQueryKeys.getLibraries, libraryQueryKeys.getLibraryStats],
				})
				options.onSuccess?.(library, _, __)
			},
		},
	)

	return { deleteLibrary, deleteLibraryAsync, ...rest }
}

export function useVisitLibrary(options: MutationOptions<Library, AxiosError, string> = {}) {
	const {
		mutate: visitLibrary,
		mutateAsync: visitLibraryAsync,
		...rest
	} = useMutation(
		[libraryQueryKeys.visitLibrary],
		async (id) => {
			const { data } = await libraryApi.visitLibrary(id)
			return data
		},
		{
			...options,
			onSuccess: async (library, _, __) => {
				await invalidateQueries({
					keys: [libraryQueryKeys.getLastVisitedLibrary],
				})
				options.onSuccess?.(library, _, __)
			},
		},
	)

	return { visitLibrary, visitLibraryAsync, ...rest }
}

export function useLibraryExclusionsQuery({
	id,
	...options
}: QueryOptions<User[]> & { id: string }) {
	const { data: excludedUsers, ...rest } = useQuery(
		[libraryQueryKeys.getExcludedUsers],
		async () => {
			const { data } = await libraryApi.getExcludedUsers(id)
			return data
		},
		options,
	)

	return { excludedUsers, ...rest }
}
