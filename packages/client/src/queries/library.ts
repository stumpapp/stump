import {
	createLibrary,
	deleteLibrary,
	editLibrary,
	getLibraries,
	getLibrariesStats,
	getLibraryById,
	getLibrarySeries,
	scanLibary,
} from '@stump/api'
import type { Library, PageInfo } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

import { useMutation, useQuery } from '../client'
import { invalidateQueries } from '../invalidate'
import { QUERY_KEYS } from '../query_keys'
import { useQueryParamStore } from '../stores'
import type { ClientQueryParams, QueryCallbacks } from '.'

const LIBRARY_KEYS = QUERY_KEYS.library

export const refreshUseLibrary = (id: string) =>
	invalidateQueries({ exact: true, queryKey: [LIBRARY_KEYS.get_by_id, id] })

export function useLibrary(id: string, { onError }: QueryCallbacks<Library> = {}) {
	const { isLoading, data: library } = useQuery(
		[LIBRARY_KEYS.get_by_id, id],
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
	const { data, ...rest } = useQuery([LIBRARY_KEYS.get], getLibraries, {
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
		[LIBRARY_KEYS.series, page, libraryId, paramsStore],
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
	} = useQuery([LIBRARY_KEYS.stats], () => getLibrariesStats().then((data) => data.data), {})

	return { isLoading: isLoading || isRefetching || isFetching, libraryStats }
}

export function useScanLibrary({ onError }: ClientQueryParams<unknown> = {}) {
	const { mutate: scan, mutateAsync: scanAsync } = useMutation([LIBRARY_KEYS.scan], scanLibary, {
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
					invalidateQueries({
						keys: [LIBRARY_KEYS.get, LIBRARY_KEYS.stats, QUERY_KEYS.job.get],
					})
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
					invalidateQueries({
						keys: [LIBRARY_KEYS.get, LIBRARY_KEYS.stats, QUERY_KEYS.job.get],
					})
					onUpdated?.(res.data)
				}
			},
		},
	)

	const { mutateAsync: deleteLibraryAsync } = useMutation(['deleteLibrary'], deleteLibrary, {
		async onSuccess(res) {
			await invalidateQueries({
				keys: [LIBRARY_KEYS.get, LIBRARY_KEYS.stats],
			})

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
