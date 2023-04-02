import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SeriesOverviewContext } from './context'

type Props = {
	seriesId?: string
	children: React.ReactNode
}

// TODO: I think this pattern might just be overkill. I think I can just pull params from the URL directly
// and push them into context as the filters? I liked the idea of moving all of this away from zustand
// and use URL params but honestly I am not sure it is worth anymore. I think it would be much simplier
// to make a couple of stores...
export default function SeriesOverviewContextProvider({ children, seriesId }: Props) {
	const [searchParams, setSearchParams] = useSearchParams()

	const filters = useMemo(() => {
		return Object.fromEntries(searchParams)
	}, [searchParams])

	return (
		<SeriesOverviewContext.Provider value={{ filters, searchParams, seriesId }}>
			{children}
		</SeriesOverviewContext.Provider>
	)
}
