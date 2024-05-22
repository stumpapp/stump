import { createContext, useContext } from 'react'

import { noop } from '../../utils/misc'

export type Ordering = {
	direction?: 'asc' | 'desc'
	order_by?: string
}

export type Pagination = {
	page: number
	page_size: number
}

export type IFilterContext = {
	filters?: Record<string, unknown>
	ordering: Ordering
	pagination: Pagination
	setPage: (page: number) => void
	setFilters: (filters: Record<string, unknown>) => void
	setFilter: (key: string, value: unknown) => void
	setOrdering: (ordering: Ordering) => void
	removeFilter: (key: string) => void
}

export const FilterContext = createContext<IFilterContext>({
	filters: {},
	ordering: {},
	pagination: { page: 1, page_size: 20 },
	removeFilter: noop,
	setFilter: noop,
	setFilters: noop,
	setOrdering: noop,
	setPage: noop,
})
export const useFilterContext = () => useContext(FilterContext)
