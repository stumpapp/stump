import { SeriesOrderBy } from '@stump/graphql'

import { useSortAndDisplayMenu } from '~/components/filter/SortAndDisplayMenu'
import { SortFieldDef } from '~/components/filter/types'
import { useSeriesFilterStore } from '~/stores/filters'

const SORT_FIELDS: SortFieldDef[] = [
	{ field: 'NAME', orderKey: 'series' },
	{ field: 'CREATED_AT', orderKey: 'series' },
	{ field: 'YEAR', orderKey: 'metadata' },
]

export function useSeriesSortAndDisplayMenu() {
	const sort = useSeriesFilterStore((store) => store.sort)
	const setSort = useSeriesFilterStore((store) => store.setSort)

	return useSortAndDisplayMenu<SeriesOrderBy>({
		sort,
		setSort,
		fields: SORT_FIELDS,
	})
}
