import { jobQueryKeys, libraryApi, libraryQueryKeys } from '@stump/api'
import type { CreateLibraryArgs, Library, PageInfo, UpdateLibraryArgs } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

import { MutationOptions, QueryOptions, useMutation, useQuery } from '../client'
import { invalidateQueries } from '../invalidate'
import { useQueryParamStore } from '../stores'

export const refreshUseLibrary = (id: string) =>
	invalidateQueries({ exact: true, queryKey: [libraryQueryKeys.getLibraryById, id] })

export function useLibrary(id: string, { enabled, ...options }: QueryOptions<Library> = {}) {
	const { isLoading, data: library } = useQuery(
		[libraryQueryKeys.getLibraryById, id],
		() => libraryApi.getLibraryById(id).then((res) => res.data),
		{
			enabled: !!id || !!enabled,
			...options,
		},
	)

	return { isLoading, library }
}

export interface UseLibrariesReturn {
	libraries: Library[]
	pageData?: PageInfo
}

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

export function useLibrarySeries(libraryId: string, page = 1) {
	const { getQueryString, ...paramsStore } = useQueryParamStore((state) => state)

	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		[libraryQueryKeys.getLibrarySeries, page, libraryId, paramsStore],
		() =>
			libraryApi.getLibrarySeries(libraryId, page, getQueryString()).then(({ data }) => ({
				pageData: data._page,
				series: data.data,
			})),
		{
			keepPreviousData: true,
		},
	)

	const { series, pageData } = data ?? {}

	return { isFetching, isLoading, isPreviousData, pageData, series }
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
	options: MutationOptions<Library, AxiosError, CreateLibraryArgs> = {},
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
	options: MutationOptions<Library, AxiosError, UpdateLibraryArgs> = {},
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
