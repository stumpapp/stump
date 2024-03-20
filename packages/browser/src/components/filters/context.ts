import { createContext, useContext } from 'react'

import { noop } from '../../utils/misc'

export type Ordering = {
	direction?: 'asc' | 'desc'
	order_by?: string
}

export type IFilterContext = {
	filters?: Record<string, unknown>
	ordering: Ordering
	setFilters: (filters: Record<string, unknown>) => void
	setFilter: (key: string, value: unknown) => void
	removeFilter: (key: string) => void
}

export const FilterContext = createContext<IFilterContext>({
	filters: {},
	ordering: {},
	removeFilter: noop,
	setFilter: noop,
	setFilters: noop,
})
export const useFilterContext = () => useContext(FilterContext)
