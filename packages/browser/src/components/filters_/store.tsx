import {
	FilterEntity,
	FilterGroup,
	isLibraryOrderBy,
	isMediaMetadataOrderBy,
	isMediaOrderBy,
	isOk,
	isSeriesOrderBy,
	MediaOrderBy,
	MediaSmartFilter,
	QueryOrder,
	SmartSearchBody,
} from '@stump/sdk'
import once from 'lodash/once'
import setProperty from 'lodash/set'
import unsetProperty from 'lodash/unset'
import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react'
import { match } from 'ts-pattern'
import { createStore, StoreApi, useStore } from 'zustand'

import {
	filter,
	FilterGroupSchema,
	intoAPIFilters,
	intoAPIGroup,
} from '../smartList/createOrUpdate'

export type Pagination = {
	page: number
	page_size: number
}

type BodyFilterState = {
	forEntity: FilterEntity
	filters?: FilterGroupSchema[]
	ordering?: QueryOrder<string>[]
	pagination: Pagination
}

type URLFilterState = {
	filters?: Record<string, unknown>
	ordering?: QueryOrder<string>
	pagination: Pagination
}

const intoBody = <F, O extends string | object>(
	{ filters, ordering, pagination: query }: BodyFilterState,
	isOrderBy: (ob?: string | object | undefined) => ob is O,
): SmartSearchBody<F, O> => {
	const orderParams = ordering?.filter((o) => isOrderBy(o.order_by)) as QueryOrder<O>[]
	// const safeFilters = filters?.map(intoAPIGroup).
	// TODO: types are hard.
	// let safeFilters: FilterGroup<F>[] | undefined
	// try {
	// 	safeFilters = filters?.map((f: FilterGroupSchema) => intoAPIGroup(f))
	// } catch (e) {}

	return {
		order_params: orderParams,
		query,
	} satisfies SmartSearchBody<F, O>
}

const _test = intoBody<MediaSmartFilter, MediaOrderBy>(
	{
		forEntity: 'media',
		pagination: {
			page: 1,
			page_size: 20,
		},
	},
	isMediaOrderBy,
)

type FilterStore = {
	bodyStore: BodyFilterState
	patchBody: (state: Partial<BodyFilterState>) => void

	urlStore: URLFilterState
	patchUrl: (state: Partial<URLFilterState>) => void
	setUrlFilter: (key: string, value: unknown) => void
	removeUrlFilter: (key: string) => void
}

const createFilterStore = (forEntity: FilterEntity) =>
	createStore<FilterStore>(
		(set, get) =>
			({
				bodyStore: {
					forEntity,
					pagination: {
						page: 1,
						page_size: 20,
					},
				} satisfies BodyFilterState,
				patchBody: (state) => {
					const entireStore = get()
					const updatedState = { ...get().bodyStore, ...state }
					set(setProperty(entireStore, 'bodyStore', updatedState))
				},
				patchUrl: (state) => {
					const entireStore = get()
					const updatedState = { ...get().urlStore, ...state }
					set(setProperty(entireStore, 'urlStore', updatedState))
				},
				removeUrlFilter: (key) => {
					const entireStore = get()
					unsetProperty(entireStore, `urlStore.filters.${key}`)
					set(entireStore)
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

export function FilterStoreProvider({
	children,
	forEntity,
}: PropsWithChildren<{ forEntity: FilterEntity }>) {
	const storeRef = useRef<StoreApi<FilterStore> | null>(null)

	useEffect(() => {
		if (!storeRef.current) {
			storeRef.current = createFilterStore(forEntity)
		}
	}, [forEntity])

	return (
		<FilterStoreContext.Provider value={storeRef.current}>{children}</FilterStoreContext.Provider>
	)
}

type Selector = (state: FilterStore) => unknown

export const useFilterStore = (selector: Selector) => {
	const store = useContext(FilterStoreContext)
	if (!store) {
		throw new Error('useFilterStore must be used within a FilterStoreProvider')
	}
	return useStore(store, selector)
}
