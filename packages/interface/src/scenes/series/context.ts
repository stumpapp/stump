import { useContext } from 'react'

import { createFilterContext, FilterContext } from '../../components/filters/context'

type SeriesOverviewContext = {
	seriesId?: string
} & FilterContext
export const SeriesOverviewContext = createFilterContext<SeriesOverviewContext>()
export const useSeriesOverviewContext = () => useContext(SeriesOverviewContext)
