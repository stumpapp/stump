import { BooksScreenStatsQuery } from '@stump/graphql'

import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { MiniEntityStatCards } from '~/components/stats'

import { useBooksFilterMenu } from './BooksFilterMenu'
import { useBooksSortAndDisplayMenu } from './BooksSortAndDisplayMenu'

type Props = {
	stats: BooksScreenStatsQuery['librariesStats']
}

export function BooksListHeader({ stats }: Props) {
	const menuFragment = useBooksListHeader()

	return (
		<>
			{menuFragment}
			<MiniEntityStatCards stats={stats} />
		</>
	)
}

export function useBooksListHeader() {
	const sortMenu = useBooksSortAndDisplayMenu()
	const filterMenu = useBooksFilterMenu()

	return useEntityListHeader({
		filterMenu,
		sortMenu,
	})
}
