import { Series } from '@stump/types'
import { createContext, useContext } from 'react'

export type ISeriesContext = {
	series: Series
}

export const SeriesContext = createContext<ISeriesContext | null>(null)
export const useSeriesContext = () => {
	const context = useContext(SeriesContext)
	if (!context) {
		throw new Error('useSeriesContext must be used within a SeriesContext')
	}
	return context
}
