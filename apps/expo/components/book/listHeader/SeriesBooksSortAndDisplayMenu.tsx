import { MediaOrderBy } from '@stump/graphql'

import { useSortAndDisplayMenu } from '~/components/filter/SortAndDisplayMenu'
import { ActionDef, SortFieldDef } from '~/components/filter/types'
import { useBookFilterStore } from '~/stores/filters'
import { useBooksLayout } from '~/stores/layout'

const SORT_FIELDS: SortFieldDef[] = [
	{ field: 'NAME', orderKey: 'media' },
	{ field: 'CREATED_AT', orderKey: 'media' },
	{ field: 'NUMBER', orderKey: 'metadata' },
	{ field: 'YEAR', orderKey: 'metadata' },
]

type Params = {
	layoutKey?: string
	actions?: ActionDef[]
}

export function useSeriesBooksSortAndDisplayMenu({ layoutKey = 'global', actions }: Params = {}) {
	const sort = useBookFilterStore((store) => store.sort)
	const setSort = useBookFilterStore((store) => store.setSort)

	const layout = useBooksLayout(layoutKey, (state) => state.layout)
	const setLayout = useBooksLayout(layoutKey, (state) => state.setLayout)

	return useSortAndDisplayMenu<MediaOrderBy>({
		sort,
		setSort,
		layout,
		setLayout,
		fields: SORT_FIELDS,
		actions,
	})
}
