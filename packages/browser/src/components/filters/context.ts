import {
	LibraryFilterInput,
	LibraryModelOrdering,
	MediaFilterInput,
	MediaModelOrdering,
	OffsetPagination,
	OrderDirection,
	SeriesFilterInput,
	SeriesModelOrdering,
} from '@stump/graphql'
import { createContext, useContext } from 'react'

import { noop } from '../../utils/misc'

export type OrderingField = MediaModelOrdering | SeriesModelOrdering | LibraryModelOrdering
export type FilterInput = MediaFilterInput | SeriesFilterInput | LibraryFilterInput

export type Ordering = {
	direction?: OrderDirection
	order_by?: OrderingField
}

export type IFilterContext = {
	filters: FilterInput
	ordering: Ordering
	pagination: OffsetPagination
	setPage: (page: number) => void
	setFilters: (filters: FilterInput) => void
	search: string | undefined
	setSearch: (value: string) => void
	setOrdering: (ordering: Ordering) => void
	removeSearch: () => void
}

export const FilterContext = createContext<IFilterContext>({
	filters: {},
	ordering: {},
	pagination: { page: 1, pageSize: 20 },
	removeSearch: noop,
	search: '',
	setSearch: noop,
	setFilters: noop,
	setOrdering: noop,
	setPage: noop,
})
export const useFilterContext = () => useContext(FilterContext)
