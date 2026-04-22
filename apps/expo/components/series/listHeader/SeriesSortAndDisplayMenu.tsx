import { SeriesOrderBy } from '@stump/graphql'

import { useSortAndDisplayMenu } from '~/components/filter/SortAndDisplayMenu'
import { ActionDef, SortFieldDef } from '~/components/filter/types'
import { useSeriesFilterStore } from '~/stores/filters'
import { useSeriesLayout } from '~/stores/layout'

const SORT_FIELDS: SortFieldDef[] = [
	{ field: 'NAME', orderKey: 'series' },
	{ field: 'CREATED_AT', orderKey: 'series' },
	{ field: 'YEAR', orderKey: 'metadata' },
]

type Params = {
	layoutKey?: string
	actions?: ActionDef[]
}

export function useSeriesSortAndDisplayMenu({ layoutKey = 'global', actions }: Params = {}) {
	const sort = useSeriesFilterStore((store) => store.sort)
	const setSort = useSeriesFilterStore((store) => store.setSort)

	const layout = useSeriesLayout(layoutKey, (state) => state.layout)
	const setLayout = useSeriesLayout(layoutKey, (state) => state.setLayout)

	return useSortAndDisplayMenu<SeriesOrderBy>({
		sort,
		setSort,
		layout,
		setLayout,
		fields: SORT_FIELDS,
		actions,
	})
}
