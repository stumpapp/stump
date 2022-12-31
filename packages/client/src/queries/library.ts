import { AxiosError } from 'axios'
import { useMemo } from 'react'

import {
	createLibrary,
	deleteLibrary,
	editLibrary,
	getLibraries,
	getLibrariesStats,
	getLibraryById,
	getLibrarySeries,
	scanLibary,
} from '../api/library'
import { useMutation, useQuery } from '../client'
import { queryClient } from '../client'
import { useQueryParamStore } from '../stores'
import type { Library, PageInfo } from '../types'
import type { ClientQueryParams, QueryCallbacks } from '.'

export function useLibrary(id: string, { onError }: QueryCallbacks<Library> = {}) {
	const { isLoading, data: library } = useQuery(
		['getLibrary', id],
		() => getLibraryById(id).then((res) => res.data),
		{
			onError,
		},
	)

	return { isLoading, library }
}

export interface UseLibrariesReturn {
	libraries: Library[]
	pageData?: PageInfo
}

export function useLibraries() {
	const { data, ...rest } = useQuery(['getLibraries'], getLibraries, {
		// context: StumpQueryContext,
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
	const { getQueryString, ...paramsStore } = useQueryParamStore()

	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		['getLibrarySeries', page, libraryId, paramsStore],
		() =>
			getLibrarySeries(libraryId, page, getQueryString()).then(({ data }) => ({
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
	} = useQuery(['getLibraryStats'], () => getLibrariesStats().then((data) => data.data), {
		// context: StumpQueryContext,
	})

	return { isLoading: isLoading || isRefetching || isFetching, libraryStats }
}

export function useScanLibrary({ onError }: ClientQueryParams<unknown> = {}) {
	const { mutate: scan, mutateAsync: scanAsync } = useMutation(['scanLibary'], scanLibary, {
		onError,
	})

	return { scan, scanAsync }
}

export function useLibraryMutation({
	onCreated,
	onUpdated,
	onDeleted,
	onCreateFailed,
	onUpdateFailed,
	onError,
}: ClientQueryParams<Library> = {}) {
	const { isLoading: createIsLoading, mutateAsync: createLibraryAsync } = useMutation(
		['createLibrary'],
		createLibrary,
		{
			onError,
			onSuccess: (res) => {
				if (!res.data) {
					onCreateFailed?.(res)
				} else {
					queryClient.invalidateQueries(['getLibraries'])
					queryClient.invalidateQueries(['getJobReports'])
					queryClient.invalidateQueries(['getLibraryStats'])
					onCreated?.(res.data)
					// onClose();
				}
			},
		},
	)

	const { isLoading: editIsLoading, mutateAsync: editLibraryAsync } = useMutation(
		['editLibrary'],
		editLibrary,
		{
			onError,
			onSuccess: (res) => {
				if (!res.data) {
					console.warn('Update failed:', res)
					onUpdateFailed?.(res)
				} else {
					queryClient.invalidateQueries(['getLibraries'])
					queryClient.invalidateQueries(['getJobReports'])
					queryClient.invalidateQueries(['getLibraryStats'])
					onUpdated?.(res.data)
				}
			},
		},
	)

	const { mutateAsync: deleteLibraryAsync } = useMutation(['deleteLibrary'], deleteLibrary, {
		async onSuccess(res) {
			await queryClient.invalidateQueries(['getLibraries'])
			await queryClient.invalidateQueries(['getLibraryStats'])
			onDeleted?.(res.data)
		},
	})

	return {
		createIsLoading,
		createLibraryAsync,
		deleteLibraryAsync,
		editIsLoading,
		editLibraryAsync,
	}
}
