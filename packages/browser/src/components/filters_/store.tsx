import {
	FilterEntity,
	FilterGroup,
	FullQueryParams,
	MediaSmartFilter,
	QueryOrder,
	SmartSearchBody,
} from '@stump/sdk'
import clone from 'lodash/cloneDeep'
import getProperty from 'lodash/get'
import setProperty from 'lodash/set'
import unsetProperty from 'lodash/unset'
import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaMatch } from 'rooks'
import { match, P } from 'ts-pattern'
import { createStore, StoreApi, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { FilterGroupSchema, intoAPIGroup } from '../smartList/createOrUpdate'

export type Pagination = {
	page: number
	page_size: number
}

type BodyFilterState = {
	forEntity: FilterEntity
	// TODO: make this full filter config, enforce AND joiner
	filters?: FilterGroupSchema[]
	// TODO: it might make sense to store a form-variant of this to then convert
	ordering?: QueryOrder<string>[]
	pagination: Pagination
	totalCount?: number
}

type URLFilterState = {
	filters?: Record<string, unknown>
	ordering?: QueryOrder<string>
	pagination: Pagination
}

export const intoFullURLParams = <F, O>(state: URLFilterState): FullQueryParams<F, O> => {
	const { filters, ordering, pagination } = state
	return {
		...filters,
		...ordering,
		...pagination,
	} as FullQueryParams<F, O>
}

const intoFilter = <F,>(forEntity: FilterEntity, input: MediaSmartFilter): F | null =>
	match(forEntity)
		.with('media', () => input as F)
		.with('media_metadata', () => (getProperty(input, 'metadata') as F) || null)
		.with('series', () => (getProperty(input, 'series') as F) || null)
		.with('series_metadata', () => (getProperty(input, 'series.metadata') as F) || null)
		.with('library', () => (getProperty(input, 'series.library') as F) || null)
		.otherwise(() => null)

const intoGroup = <F,>(
	forEntity: FilterEntity,
	input: FilterGroup<MediaSmartFilter>,
): FilterGroup<F> | null => {
	const key = match(input)
		.with({ and: P.array() }, () => 'and' as const)
		.with({ or: P.array() }, () => 'or' as const)
		.with({ not: P.array() }, () => 'not' as const)
		.otherwise(() => null)

	if (!key) {
		return null
	}

	const filters = getProperty(input, key) || []
	const converted = filters.map((f) => intoFilter(forEntity, f)).filter(Boolean)
	if (!converted.length) {
		return null
	}

	return { [key]: converted } as FilterGroup<F>
}

/**
 * A function to convert the internal state of the filter store into a SmartSearchBody,
 * which is used to make API requests.
 */
export const intoBody = <F, O extends string | object>(
	{ forEntity, filters, ordering, pagination: query }: BodyFilterState,
	isOrderBy: (ob?: string | object | undefined) => ob is O,
): SmartSearchBody<F, O> => {
	const orderParams = ordering?.filter((o) => isOrderBy(o.order_by)) as QueryOrder<O>[]

	let safeFilters: FilterGroup<F>[] | undefined = undefined
	try {
		safeFilters = filters
			?.map(intoAPIGroup)
			.map((f) => intoGroup<F>(forEntity, f))
			.filter(Boolean) as FilterGroup<F>[]
	} catch (e) {
		console.error('Error converting filters to API format', e)
	}

	return {
		filters: safeFilters,
		order_params: orderParams,
		query,
	} satisfies SmartSearchBody<F, O>
}

type FilterStore = {
	mode: 'body' | 'url'
	setMode: (mode: 'body' | 'url') => void
	setPage: (page: number) => void
	setPageSize: (pageSize: number) => void

	bodyStore: BodyFilterState
	patchBody: (state: Partial<BodyFilterState>) => void

	urlStore: URLFilterState
	patchUrl: (state: Partial<URLFilterState>) => void
	setUrlFilter: (key: string, value: unknown) => void
	removeUrlFilter: (key: string) => void
}

// TODO: default ordering...
type CreateFilterStoreOptions = {
	defaultBody?: FilterGroupSchema[]
	defaultUrl?: Record<string, unknown>
}

const createFilterStore = (forEntity: FilterEntity, options: CreateFilterStoreOptions = {}) =>
	createStore<FilterStore>(
		(set, get) =>
			({
				bodyStore: {
					filters: options.defaultBody,
					forEntity,
					pagination: {
						page: 1,
						page_size: 20,
					},
				} satisfies BodyFilterState,
				mode: 'url',
				patchBody: (state) => {
					const entireStore = clone(get())
					const updatedBody = { ...get().bodyStore, ...state }
					set(setProperty(entireStore, 'bodyStore', updatedBody))
				},
				patchUrl: (state) => {
					const entireStore = clone(get())
					const updatedUrlState = { ...get().urlStore, ...state }
					set(setProperty(entireStore, 'urlStore', updatedUrlState))
				},
				removeUrlFilter: (key) => {
					const entireStore = clone(get())
					unsetProperty(entireStore, `urlStore.filters.${key}`)
					set(entireStore)
				},
				setMode: (mode) => set({ mode }),
				setPage: (page) => {
					const entireStore = clone(get())
					if (entireStore.mode === 'url') {
						set(setProperty(entireStore, 'urlStore.pagination.page', page))
					} else {
						set(setProperty(entireStore, 'bodyStore.pagination.page', page))
					}
				},
				setPageSize: (pageSize) => {
					const entireStore = clone(get())
					if (entireStore.mode === 'url') {
						set(setProperty(entireStore, 'urlStore.pagination.page_size', pageSize))
					} else {
						set(setProperty(entireStore, 'bodyStore.pagination.page_size', pageSize))
					}
				},
				setUrlFilter: (key, value) => {
					const entireStore = clone(get())
					const updatedFilters = { ...get().urlStore.filters, [key]: value }
					set(setProperty(entireStore, 'urlStore.filters', updatedFilters))
				},
				urlStore: {
					filters: options.defaultUrl,
					pagination: {
						page: 1,
						page_size: 20,
					},
				} satisfies URLFilterState,
			}) satisfies FilterStore,
	)

const FilterStoreContext = createContext<StoreApi<FilterStore> | null>(null)

// TODO: default ordering...
type ProviderProps = {
	forEntity: FilterEntity
	defaultBodyFilters?: FilterGroupSchema[]
	defaultURLFilters?: Record<string, unknown>
}
export function FilterStoreProvider({
	children,
	forEntity,
	defaultBodyFilters,
	defaultURLFilters,
}: PropsWithChildren<ProviderProps>) {
	const storeRef = useRef<StoreApi<FilterStore> | null>(null)

	if (!storeRef.current) {
		storeRef.current = createFilterStore(forEntity, {
			defaultBody: defaultBodyFilters,
			defaultUrl: defaultURLFilters,
		})
	}

	return (
		<FilterStoreContext.Provider value={storeRef.current}>{children}</FilterStoreContext.Provider>
	)
}

type ExtractState<S> = S extends {
	getState: () => infer T
}
	? T
	: never

export const useFilterStore = <U,>(selector: (state: ExtractState<StoreApi<FilterStore>>) => U) => {
	const store = useContext(FilterStoreContext)
	if (!store) {
		throw new Error('useFilterStore must be used within a FilterStoreProvider')
	}
	return useStore<StoreApi<FilterStore>, U>(store, selector)
}

export const useSyncParams = () => {
	const [searchParams, setSearchParams] = useSearchParams()

	const { mode, setPage, setPageSize, urlStore, bodyStore, ...store } = useFilterStore(
		useShallow((state) => state),
	)

	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')
	const defaultPageSize = is3XLScreenOrBigger ? 40 : 20

	const changePage = useCallback(
		(page: number) => {
			if (mode === 'url') {
				setSearchParams((prev) => {
					prev.set('page', page.toString())
					return prev
				})
			} else {
				setPage(page)
			}
		},
		[setPage, mode, setSearchParams],
	)

	/**
	 * An object representation of the pagination params currently in the url
	 */
	const urlPagination = useMemo(
		() => ({
			page: searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1,
			page_size: searchParams.get('page_size')
				? parseInt(searchParams.get('page_size') as string)
				: defaultPageSize,
		}),
		[searchParams, defaultPageSize],
	)
	const { pagination } = urlStore
	useEffect(() => {
		if (mode === 'body') return

		const { page, page_size } = pagination
		const isDifferent = page !== urlPagination.page || page_size !== urlPagination.page_size
		if (isDifferent) {
			setPageSize(urlPagination.page_size)
			setPage(urlPagination.page)
		}
	}, [mode, pagination, urlPagination, setSearchParams, setPage, setPageSize])

	const resolvedPagination = useMemo(
		() => (mode === 'body' ? bodyStore.pagination : urlStore.pagination),
		[mode, bodyStore, urlStore],
	)
	return { changePage, pagination: resolvedPagination }
}

export const useSyncSearch = () => {
	const [searchParams, setSearchParams] = useSearchParams()

	const { mode, setUrlFilter, removeUrlFilter, urlStore, bodyStore, ...store } = useFilterStore(
		useShallow((state) => state),
	)

	const urlSearch = useMemo(() => searchParams.get('search') || undefined, [searchParams])
	const { filters } = urlStore
	useEffect(() => {
		if (mode === 'body') return

		const isDifferent = filters?.search !== urlSearch
		if (!isDifferent) return
		if (urlSearch) {
			setUrlFilter('search', urlSearch)
		} else {
			removeUrlFilter('search')
		}
	}, [mode, urlSearch, filters?.search, setUrlFilter, removeUrlFilter])

	const updateSearch = useCallback(
		(value?: string) => {
			if (mode === 'body') return

			setSearchParams((prev) => {
				if (value) {
					prev.set('search', value)
				} else {
					prev.delete('search')
				}
				return prev
			})
		},
		[setUrlFilter, removeUrlFilter],
	)

	return {
		updateSearch,
	}
}
