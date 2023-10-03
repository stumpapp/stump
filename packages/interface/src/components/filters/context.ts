import { createContext, useContext } from 'react'

import { noop } from '../../utils/misc'

export type IFilterContext = {
	filters?: Record<string, unknown>
	setFilters: (filters: Record<string, unknown>) => void
	setFilter: (key: string, value: unknown) => void
	removeFilter: (key: string) => void
}

export const FilterContext = createContext<IFilterContext>({
	filters: {},
	removeFilter: noop,
	setFilter: noop,
	setFilters: noop,
})
export const useFilterContext = () => useContext(FilterContext)
