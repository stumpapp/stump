import { createContext, useContext } from 'react'

export type ISeriesContext = {
	seriesId: string
}

export const SeriesContext = createContext<ISeriesContext>({
	seriesId: '',
})
export const useSeriesContext = () => useContext(SeriesContext)
