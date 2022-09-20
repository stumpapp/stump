import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { Direction, PageParams } from '@stump/core';

import { StoreBase } from './';

export const DEFAULT_ORDER_BY = 'name';
export const DEFAULT_ORDER_DIRECTION = 'asc';
export const DEFAULT_PAGE_SIZE = 20;

// TODO: search?
export interface QueryParamStore extends Partial<PageParams>, StoreBase<QueryParamStore> {
	setZeroBased: (zeroBased?: boolean) => void;
	setPageSize: (pageSize?: number) => void;
	setOrderBy: (orderBy?: string) => void;
	setDirection: (direction?: Direction) => void;

	getQueryString: () => string;
}

const defaultValues = {
	// zeroBased: false,
	// pageSize: 20,
	direction: 'asc',
} as Partial<QueryParamStore>;

export const useQueryParamStore = create<QueryParamStore>()(
	devtools(
		persist(
			(set, get) => ({
				...defaultValues,

				setZeroBased(zeroBased) {
					set((store) => ({ ...store, zero_based: zeroBased }));
				},
				setPageSize(pageSize) {
					set((store) => ({ ...store, page_zize: pageSize }));
				},
				setOrderBy(orderBy) {
					set((store) => ({ ...store, order_by: orderBy }));
				},
				setDirection(direction) {
					set((store) => ({ ...store, direction }));
				},

				getQueryString() {
					let params = '';

					for (const [key, value] of Object.entries(get())) {
						if (value != undefined && typeof value !== 'function' && typeof value !== 'object') {
							params += `${key}=${value}&`;
						}
					}

					// remote trailing & if present
					if (params.endsWith('&')) {
						return params.slice(0, -1);
					}

					return params;
				},

				reset() {
					set(() => ({}));
				},
				set(changes) {
					set((state) => ({ ...state, ...changes }));
				},
			}),
			{
				name: 'stump-query-param-store',
				getStorage: () => sessionStorage,
				partialize(store) {
					return {
						direction: store.direction,
					};
				},
			},
		),
	),
);
