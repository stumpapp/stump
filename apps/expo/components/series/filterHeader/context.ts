import { createContext, useContext } from 'react'

export type ISeriesFilterHeaderContext = {
	libraryId?: string | null
}

export const SeriesFilterHeaderContext = createContext<ISeriesFilterHeaderContext | undefined>(
	undefined,
)

export const useSeriesFilterHeaderContext = () => {
	const context = useContext(SeriesFilterHeaderContext)
	if (!context) {
		throw new Error('useSeriesFilterHeaderContext must be used within a SeriesFilterHeaderProvider')
	}
	return context
}
