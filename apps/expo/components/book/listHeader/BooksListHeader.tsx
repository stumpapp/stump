import { BooksScreenStatsQuery } from '@stump/graphql'
import { formatHumanDurationSeparate } from '@stump/i18n'
import { BookCheck, BookOpen, Clock, Layers } from 'lucide-react-native'
import { View } from 'react-native'

import { Divider } from '~/components/Divider'
import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { MiniStatCard } from '~/components/StatCard'
import { STAT_COLORS } from '~/lib/constants'

import { useBooksFilterMenu } from './BooksFilterMenu'
import { useBooksSortAndDisplayMenu } from './BooksSortAndDisplayMenu'

type Props = {
	stats: BooksScreenStatsQuery['librariesStats']
}

export function BooksListHeader({ stats }: Props) {
	const menuFragment = useBooksListHeader()
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

export function useBooksListHeader() {
	const sortMenu = useBooksSortAndDisplayMenu()
	const filterMenu = useBooksFilterMenu()

	return useEntityListHeader({
		filterMenu,
		sortMenu,
	})
}
