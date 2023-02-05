import type { Direction, PageParams, QueryOrder } from '@stump/types'
import create from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { StoreBase } from '.'

export const DEFAULT_ORDER_BY = 'name'
export const DEFAULT_ORDER_DIRECTION = 'asc'
export const DEFAULT_PAGE_SIZE = 20

// TODO: search?
export interface QueryParamStore
	extends Partial<PageParams & QueryOrder>,
		StoreBase<QueryParamStore> {
	setZeroBased: (zeroBased?: boolean) => void
	setPageSize: (pageSize?: number) => void
	setOrderBy: (orderBy?: string) => void
	setDirection: (direction?: Direction) => void

	getQueryString: () => string
}

const defaultValues: Partial<QueryParamStore> = {
	direction: 'asc',
	// zeroBased: false,
	// pageSize: 20,
	order_by: 'name',
}

export const useQueryParamStore = create<QueryParamStore>()(
	devtools(
		persist(
			(set, get) => ({
				...defaultValues,

				getQueryString() {
					let params = ''

					for (const [key, value] of Object.entries(get())) {
						if (value != undefined && typeof value !== 'function' && typeof value !== 'object') {
							params += `${key}=${value}&`
						}
					}

					// remote trailing & if present
					if (params.endsWith('&')) {
						return params.slice(0, -1)
					}

					return params
				},
				reset() {
					set(() => ({}))
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }))
				},
				setDirection(direction) {
					set((store) => ({ ...store, direction }))
				},

				setOrderBy(orderBy) {
					set((store) => ({ ...store, order_by: orderBy }))
				},

				setPageSize(pageSize) {
					set((store) => ({ ...store, page_zize: pageSize }))
				},
				setZeroBased(zeroBased) {
					set((store) => ({ ...store, zero_based: zeroBased }))
				},
			}),
			{
				getStorage: () => sessionStorage,
				name: 'stump-query-param-store',
				partialize(store) {
					return {
						direction: store.direction,
					}
				},
			},
		),
	),
)
