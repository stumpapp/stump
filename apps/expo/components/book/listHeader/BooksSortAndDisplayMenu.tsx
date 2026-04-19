import { MediaOrderBy } from '@stump/graphql'

import { useEntitySortMenu } from '~/components/filter/EntitySortMenu'
import { SortFieldDef } from '~/components/filter/types'
import { useBookFilterStore } from '~/stores/filters'

const SORT_FIELDS: SortFieldDef[] = [
	{ field: 'NAME', orderKey: 'media' },
	{ field: 'CREATED_AT', orderKey: 'media' },
	{ field: 'YEAR', orderKey: 'metadata' },
]

export function useBooksSortAndDisplayMenu() {
	const sort = useBookFilterStore((store) => store.sort)
	const setSort = useBookFilterStore((store) => store.setSort)

	return useEntitySortMenu<MediaOrderBy>({
		sort,
		setSort,
		fields: SORT_FIELDS,
	})
}
