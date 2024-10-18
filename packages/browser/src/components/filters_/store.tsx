import { QueryOrder } from '@stump/sdk'
import once from 'lodash/once'
import setProperty from 'lodash/set'
import unsetProperty from 'lodash/unset'
import { createContext, PropsWithChildren, useContext, useRef } from 'react'
import { createStore, StoreApi, useStore } from 'zustand'

export type URLPagination = {
	page: number
	page_size: number
}

type URLFilterState = {
	filters?: Record<string, unknown>
	ordering?: QueryOrder<string>
	pagination: URLPagination
}

type BodyFilterState<F, O> = {
	filters?: F
	ordering?: O
	pagination: URLPagination
}

type FilterStore<F = Record<string, unknown>, O = string> = {
	bodyStore: BodyFilterState<F, O>
	patchBody: (state: Partial<BodyFilterState<F, O>>) => void

	urlStore: URLFilterState
	patchUrl: (state: Partial<URLFilterState>) => void
	setUrlFilter: (key: string, value: unknown) => void
	removeUrlFilter: (key: string) => void
}

function createFilterStore<F = Record<string, unknown>, O = string>() {
	return createStore<FilterStore<F, O>>(
		(set, get) =>
			({
				bodyStore: {
					pagination: {
						page: 1,
						page_size: 20,
					},
				} satisfies BodyFilterState<F, O>,
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
			}) satisfies FilterStore<F, O>,
	)
}

// const createGenericContext = once(<F, O>() => createContext(null as FilterStore<F, O> | null))

const FilterStoreContext = createContext<StoreApi<FilterStore> | null>(null)

export function FilterStoreProvider<F extends Record<string, unknown>, O extends string>({
	children,
}: PropsWithChildren) {
	const storeRef = useRef<StoreApi<FilterStore<F, O>> | null>(null)

	if (!storeRef.current) {
		storeRef.current = createFilterStore<F, O>()
	}

	const casted = storeRef.current as StoreApi<FilterStore<F, O>> | null

	// @ts-expect-error: React sucks with generic contexts
	return <FilterStoreContext.Provider value={casted}>{children}</FilterStoreContext.Provider>
}

type Selector<F, O> = (state: FilterStore<F, O>) => unknown

export function useFilterStore<F extends Record<string, unknown>, O extends string>(
	selector: Selector<F, O>,
) {
	const store = useContext(FilterStoreContext)
	if (!store) {
		throw new Error('Missing FilterStoreProvider')
	}
	// @ts-expect-error: React sucks with generic contexts
	return useStore(store, selector)
}

// const useFilterStore = (selector: Selector) => {
// 	const store = useContext(StoreContext)
// 	if (!store) {
// 		throw new Error('Missing StoreProvider')
// 	}
// 	return useStore(store, selector)
// }
