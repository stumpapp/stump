import {
	FilterEntity,
	FilterGroup,
	MediaSmartFilter,
	QueryOrder,
	SmartSearchBody,
} from '@stump/sdk'
import getProperty from 'lodash/get'
import setProperty from 'lodash/set'
import unsetProperty from 'lodash/unset'
import { createContext, PropsWithChildren, useContext, useRef } from 'react'
import { match, P } from 'ts-pattern'
import { createStore, StoreApi, useStore } from 'zustand'

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
}

type URLFilterState = {
	filters?: Record<string, unknown>
	ordering?: QueryOrder<string>
	pagination: Pagination
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

const createFilterStore = (forEntity: FilterEntity, defaultBodyFilters?: FilterGroupSchema[]) =>
	createStore<FilterStore>(
		(set, get) =>
			({
				bodyStore: {
					filters: defaultBodyFilters,
					forEntity,
					pagination: {
						page: 1,
						page_size: 20,
					},
				} satisfies BodyFilterState,
				mode: 'url',
				patchBody: (state) => {
					const entireStore = get()
					const updatedBody = { ...get().bodyStore, ...state }
					set(setProperty(entireStore, 'bodyStore', updatedBody))
				},
				patchUrl: (state) => {
					const entireStore = get()
					const updatedUrlState = { ...get().urlStore, ...state }
					set(setProperty(entireStore, 'urlStore', updatedUrlState))
				},
				removeUrlFilter: (key) => {
					const entireStore = get()
					unsetProperty(entireStore, `urlStore.filters.${key}`)
					set(entireStore)
				},
				setMode: (mode) => set({ mode }),
				setPage: (page) => {
					const entireStore = get()
					if (entireStore.mode === 'url') {
						set(setProperty(entireStore, 'urlStore.pagination.page', page))
					} else {
						set(setProperty(entireStore, 'bodyStore.pagination.page', page))
					}
				},
				setPageSize: (pageSize) => {
					const entireStore = get()
					if (entireStore.mode === 'url') {
						set(setProperty(entireStore, 'urlStore.pagination.page_size', pageSize))
					} else {
						set(setProperty(entireStore, 'bodyStore.pagination.page_size', pageSize))
					}
				},
				setUrlFilter: (key, value) => {
					const entireStore = get()
					const updatedState = { ...get().urlStore.filters, [key]: value }
					set(setProperty(entireStore, 'urlStore.filters', updatedState))
				},
				urlStore: {
					pagination: {
						page: 1,
						page_size: 20,
					},
				} satisfies URLFilterState,
			}) satisfies FilterStore,
	)

const FilterStoreContext = createContext<StoreApi<FilterStore> | null>(null)

type ProviderProps = {
	forEntity: FilterEntity
	defaultBodyFilters?: FilterGroupSchema[]
}
export function FilterStoreProvider({ children, forEntity }: PropsWithChildren<ProviderProps>) {
	const storeRef = useRef<StoreApi<FilterStore> | null>(null)

	if (!storeRef.current) {
		storeRef.current = createFilterStore(forEntity)
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
