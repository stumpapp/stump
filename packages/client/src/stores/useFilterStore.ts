import type { Direction, PageParams, QueryOrder } from '@stump/types'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import { StoreBase } from '.'

export const DEFAULT_ORDER_BY = 'name'
export const DEFAULT_ORDER_DIRECTION = 'asc'
export const DEFAULT_PAGE_SIZE = 20

export type Filters = Partial<
	{
		show_unsupported?: boolean
	} & Pick<PageParams, 'page_size'> &
		QueryOrder
>

export interface FilterStore extends Filters, StoreBase<FilterStore> {
	setZeroBased: (zeroBased?: boolean) => void
	setPageSize: (pageSize?: number) => void
	setOrderBy: (orderBy?: string) => void
	setDirection: (direction?: Direction) => void
}

export const createFilterStore = (name: string) =>
	create<FilterStore>()(
		devtools(
			persist(
				(set) => ({
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
					name,
					partialize(store) {
						return {
							direction: store.direction,
						}
					},
				},
			),
		),
	)
