import { MediaFilterInput, MediaModelOrdering, MediaOrderBy, OrderDirection } from '@stump/graphql'
import { create } from 'zustand'

export type IFilterStore<F, O> = {
	filters: F
	setFilters: (filters: F) => void
	sort: O
	setSort: (sort: O) => void
	secondarySort?: O | null
	setSecondarySort: (sort: O | null) => void
}

export function createFilterStore<F, O>(defaultFilter: F, defaultSort: O) {
	return create<IFilterStore<F, O>>((set) => ({
		filters: defaultFilter,
		setFilters: (filters) => set({ filters }),
		sort: defaultSort,
		setSort: (sort) => set({ sort }),
		secondarySort: null,
		setSecondarySort: (secondarySort) => set({ secondarySort }),
	}))
}

export const useBookFilterStore = createFilterStore<MediaFilterInput, MediaOrderBy>(
	{},
	{
		media: { field: MediaModelOrdering.Name, direction: OrderDirection.Asc },
	},
)
