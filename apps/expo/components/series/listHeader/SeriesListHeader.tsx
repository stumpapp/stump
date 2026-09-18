import { SeriesScreenStatsQuery } from '@stump/graphql'

import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { MiniEntityStatCards } from '~/components/stats'

import { useSeriesFilterMenu } from './SeriesFilterMenu'
import { useSeriesSortAndDisplayMenu } from './SeriesSortAndDisplayMenu'

type Props = {
	stats: SeriesScreenStatsQuery['librariesStats']
}

export function SeriesListHeader({ stats }: Props) {
	const menuFragment = useSeriesListHeader()

	return (
		<>
			{menuFragment}
			<MiniEntityStatCards stats={stats} />
		</>
	)
}

export function useSeriesListHeader() {
	const sortMenu = useSeriesSortAndDisplayMenu()
	const filterMenu = useSeriesFilterMenu()

	return useEntityListHeader({
		filterMenu,
		sortMenu,
	})
}
