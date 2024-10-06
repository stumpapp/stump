import { createContext, useContext } from 'react'

export type IFilterGroupContext = {
	groupIdx: number
}

export const FilterGroupContext = createContext<IFilterGroupContext | null>(null)

export const useFilterGroupContext = () => {
	const context = useContext(FilterGroupContext)
	if (!context) {
		throw new Error('FilterGroupContext is not provided')
	}
	return context
}
