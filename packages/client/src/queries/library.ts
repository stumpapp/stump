import { jobQueryKeys, libraryApi, libraryQueryKeys } from '@stump/api'
import type { CreateLibrary, Library, UpdateLibrary } from '@stump/types'
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
