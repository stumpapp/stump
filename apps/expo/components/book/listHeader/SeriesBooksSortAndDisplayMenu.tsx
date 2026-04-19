import { MediaOrderBy } from '@stump/graphql'

import { useSortAndDisplayMenu } from '~/components/filter/SortAndDisplayMenu'
import { ActionDef, SortFieldDef } from '~/components/filter/types'
import { useBookFilterStore } from '~/stores/filters'

const SORT_FIELDS: SortFieldDef[] = [
	{ field: 'NAME', orderKey: 'media' },
	{ field: 'CREATED_AT', orderKey: 'media' },
	{ field: 'NUMBER', orderKey: 'metadata' },
	{ field: 'YEAR', orderKey: 'metadata' },
]

export function useSeriesBooksSortAndDisplayMenu(actions?: ActionDef[]) {
	const sort = useBookFilterStore((store) => store.sort)
	const setSort = useBookFilterStore((store) => store.setSort)

	return useSortAndDisplayMenu<MediaOrderBy>({
		sort,
		setSort,
		fields: SORT_FIELDS,
		actions,
	})
}
