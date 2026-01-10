import {
	MediaFilterInput,
	MediaModelOrdering,
	MediaOrderBy,
	OrderDirection,
	SeriesFilterInput,
	SeriesModelOrdering,
	SeriesOrderBy,
} from '@stump/graphql'
import clone from 'lodash/cloneDeep'
import { createContext, useContext } from 'react'
import { create, useStore } from 'zustand'

export type IFilterStore<F, O> = {
	filters: F
	setFilters: (filters: F) => void
	resetFilters: () => void
	sort: O
	setSort: (sort: O) => void
	secondarySort?: O | null
	setSecondarySort: (sort: O | null) => void
}

export function createFilterStore<F, O>(defaultFilter: F, defaultSort: O) {
	return create<IFilterStore<F, O>>((set) => ({
		filters: clone(defaultFilter),
		setFilters: (filters) => set({ filters: clone(filters) }),
		resetFilters: () => {
			set({ filters: clone(defaultFilter) })
		},
		sort: clone(defaultSort),
		setSort: (sort) => set({ sort }),
		secondarySort: null,
		setSecondarySort: (secondarySort) => set({ secondarySort }),
	}))
}

export const createBookFilterStore = () =>
	createFilterStore<MediaFilterInput, MediaOrderBy>(
		{},
		{
			media: { field: MediaModelOrdering.Name, direction: OrderDirection.Asc },
		},
	)

export type BookFilterStore = ReturnType<typeof createBookFilterStore>

export const BookFilterContext = createContext<BookFilterStore | null>(null)

export const useBookFilterStore = <T>(
	selector: (state: IFilterStore<MediaFilterInput, MediaOrderBy>) => T,
): T => {
	const store = useContext(BookFilterContext)
	if (!store) throw new Error('useBookFilterStore must be used within a BookFilterProvider')
	return useStore(store, selector)
}

export const createSeriesFilterStore = () =>
	createFilterStore<SeriesFilterInput, SeriesOrderBy>(
		{},
		{
			series: { field: SeriesModelOrdering.Name, direction: OrderDirection.Asc },
		},
	)

export type SeriesFilterStore = ReturnType<typeof createSeriesFilterStore>

export const SeriesFilterContext = createContext<SeriesFilterStore | null>(null)

export const useSeriesFilterStore = <T>(
	selector: (state: IFilterStore<SeriesFilterInput, SeriesOrderBy>) => T,
): T => {
	const store = useContext(SeriesFilterContext)
	if (!store) throw new Error('useSeriesFilterStore must be used within a SeriesFilterProvider')
	return useStore(store, selector)
}
