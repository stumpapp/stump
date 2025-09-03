import { createContext, useContext } from 'react'

export type IBookFilterHeaderContext = {
	seriesId?: string | null
}

export const BookFilterHeaderContext = createContext<IBookFilterHeaderContext | undefined>(
	undefined,
)

export const useBookFilterHeaderContext = () => {
	const context = useContext(BookFilterHeaderContext)
	if (!context) {
		throw new Error('useBookFilterHeaderContext must be used within a BookFilterHeaderProvider')
	}
	return context
}
