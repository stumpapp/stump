import { SeriesScreenStatsQuery } from '@stump/graphql'
import { formatHumanDurationSeparate } from '@stump/i18n'
import { BookCheck, BookOpen, Clock, Layers } from 'lucide-react-native'
import { View } from 'react-native'

import { Divider } from '~/components/Divider'
import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { MiniStatCard } from '~/components/StatCard'
import { STAT_COLORS } from '~/lib/constants'

import { useSeriesFilterMenu } from './SeriesFilterMenu'
import { useSeriesSortAndDisplayMenu } from './SeriesSortAndDisplayMenu'

type Props = {
	stats: SeriesScreenStatsQuery['librariesStats']
}

export function SeriesListHeader({ stats }: Props) {
	const menuFragment = useSeriesListHeader()
	const formattedTime = formatHumanDurationSeparate(stats.totalReadingTimeSeconds)

	return (
		<>
			{menuFragment}

			<View className="gap-4">
				<View className="px-4 gap-2 flex-row flex-wrap">
					<MiniStatCard
						value={stats.inProgressBooks}
						icon={BookOpen}
						baseColor={STAT_COLORS.inProgress}
					/>

					<MiniStatCard
						value={stats.completedBooks}
						suffix={`/ ${stats.bookCount}`}
						icon={BookCheck}
						baseColor={STAT_COLORS.completed}
					/>
					<MiniStatCard value={stats.seriesCount} icon={Layers} baseColor={STAT_COLORS.series} />
					<MiniStatCard
						value={formattedTime ? formattedTime.value : '??'}
						suffix={formattedTime ? formattedTime.unit : undefined}
						icon={Clock}
						baseColor={STAT_COLORS.readingTime}
					/>
				</View>
				<Divider />
			</View>
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
