import { createFilterStore } from '@stump/client'
import { useMemo, useState } from 'react'

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
	const [store] = useState(() => createFilterStore('series-overview-filters'))
	const filterValues = store(({ direction, order_by, page_size, show_unsupported }) => ({
		direction,
		order_by,
		page_size,
		show_unsupported,
	}))

	const filters = useMemo(() => {
		// only return filters that have a value, ensure result is a string
		return Object.fromEntries(
			Object.entries(filterValues).filter(([_, value]) => value !== undefined),
		) as Record<string, string>
	}, [filterValues])

	return (
		<SeriesOverviewContext.Provider value={{ filters, seriesId }}>
			{children}
		</SeriesOverviewContext.Provider>
	)
}
