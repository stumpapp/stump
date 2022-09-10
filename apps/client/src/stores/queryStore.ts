import { PagedRequestParams } from '@stump/core';
import create, { GetState, SetState, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import createContext from 'zustand/context';
import { devtools } from 'zustand/middleware';

interface QueryStoreFunctions {
	setZeroBased(zeroBased: boolean | null): void;
	setPage(page: number | null): void;
	setPageSize(pageSize: number | null): void;
	setOrderBy(orderBy: string | null): void;
	setDirection(direction: 'asc' | 'desc'): void;
	setOrderByOptions(orderByOptions: string[]): void;

	asParams(): PagedRequestParams;
	output(): string;
}

interface QueryStore extends PagedRequestParams, QueryStoreFunctions {
	orderByOptions: string[];
}

// FIXME: name is kinda very misleading...
// TODO: I am really not sure if this is the best way to go about this...

const { Provider: QueryStoreProvider, useStore: useQueryStore } = createContext<QueryStore>();

let store: StateCreator<QueryStore, SetState<QueryStore>, GetState<QueryStore>> = (set, get) => ({
	zeroBased: false,
	page: null,
	pageSize: 20,
	orderBy: null,
	direction: null,

	orderByOptions: ['name'],

	setZeroBased(zeroBased) {
		set(() => ({ zeroBased }));
	},

	setPage(page) {
		set(() => ({ page }));
	},

	setPageSize(pageSize) {
		set(() => ({ pageSize }));
	},

	setOrderBy(orderBy) {
		set(() => ({ orderBy }));
	},

	setDirection(direction) {
		set(() => ({ direction }));
	},

	setOrderByOptions(orderByOptions) {
		set(() => ({ orderByOptions }));
	},

	asParams(): PagedRequestParams {
		return {
			zeroBased: get().zeroBased,
			page: get().page,
			pageSize: get().pageSize,
			orderBy: get().orderBy,
			direction: get().direction,
		};
	},

	output(): string {
		let params = get().asParams();

		let output = '';

		Object.keys(params).forEach((k) => {
			const key = k as keyof PagedRequestParams;

			if (params[key] !== null) {
				output += `${key}=${params[key]}&`;
			}
		});

		return output;
	},
});

// if development mode, use devtools middleware to expose the zustand store
// to the redux chrome devtools extension
if (import.meta.env.NODE_ENV !== 'production') {
	store = devtools(store) as UseBoundStore<QueryStore, StoreApi<QueryStore>>;
}

const queryStore = create<QueryStore>(store);

let createQueryStore = () => queryStore;

export default createQueryStore;

export { QueryStoreProvider, useQueryStore };
