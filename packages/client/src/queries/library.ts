import { jobQueryKeys, libraryApi, libraryQueryKeys } from '@stump/api'
import type { CreateLibrary, Library, PageInfo, Series, UpdateLibrary } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

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

export interface UseLibrariesReturn {
	libraries: Library[]
	pageData?: PageInfo
}

// TODO: https://github.com/microsoft/TypeScript/issues/49055 fix this type error!!
export function useLibraries() {
	const { data, ...rest } = useQuery([libraryQueryKeys.getLibraries], libraryApi.getLibraries, {
		// Send all non-401 errors to the error page
		useErrorBoundary: (err: AxiosError) => !err || (err.response?.status ?? 500) !== 401,
	})

	const { libraries, pageData } = useMemo<UseLibrariesReturn>(() => {
		if (data?.data) {
			return {
				libraries: data.data.data,
				pageData: data.data._page,
			}
		}

		return { libraries: [] }
	}, [data])

	return {
		libraries,
		pageData,
		...rest,
	}
}

export function useLibrarySeriesQuery(libraryId: string, options: PageQueryOptions<Series>) {
	const { data, ...restReturn } = usePageQuery(
		[libraryQueryKeys.getLibrarySeries, libraryId, options.params],
		async ({ page = 1, ...rest }) => {
			const { data } = await libraryApi.getLibrarySeries(libraryId, { page, ...rest })
			return data
		},
		{
			...options,
			keepPreviousData: true,
		},
	)

	const series = data?.data
	const pageData = data?._page

	return {
		pageData,
		series,
		...restReturn,
	}
}

export function useLibraryStats() {
	const {
		data: libraryStats,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(
		[libraryQueryKeys.getLibrariesStats],
		() => libraryApi.getLibrariesStats().then((data) => data.data),
		{},
	)

	return { isLoading: isLoading || isRefetching || isFetching, libraryStats }
}

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
						libraryQueryKeys.getLibrariesStats,
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
						libraryQueryKeys.getLibrariesStats,
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
					keys: [libraryQueryKeys.getLibraries, libraryQueryKeys.getLibrariesStats],
				})
				options.onSuccess?.(library, _, __)
			},
		},
	)

	return { deleteLibrary, deleteLibraryAsync, ...rest }
}
