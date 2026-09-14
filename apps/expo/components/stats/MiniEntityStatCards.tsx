import { formatHumanDurationSeparate } from '@stump/i18n'
import { BookCheck, BookOpen, Clock, Layers } from 'lucide-react-native'
import { View } from 'react-native'

import { Divider } from '~/components/Divider'
import { STAT_COLORS } from '~/lib/constants'

import { MiniStatCard } from './StatCard'

type Stats = {
	inProgressBooks: number
	completedBooks: number
	bookCount: number
	seriesCount?: number
	totalReadingTimeSeconds: number
}

type Props = {
	stats: Stats
}

export function MiniEntityStatCards({ stats }: Props) {
	const formattedTime = formatHumanDurationSeparate(stats.totalReadingTimeSeconds)

	return (
		<View className="gap-4">
			<View className="px-4 gap-2 flex-row flex-wrap">
				<MiniStatCard
					value={stats.inProgressBooks}
					icon={BookOpen}
					colors={STAT_COLORS.inProgress}
				/>

				<MiniStatCard
					value={stats.completedBooks}
					suffix={`/ ${stats.bookCount}`}
					icon={BookCheck}
					colors={STAT_COLORS.completed}
				/>
				{stats.seriesCount != null && (
					<MiniStatCard value={stats.seriesCount} icon={Layers} colors={STAT_COLORS.series} />
				)}
				<MiniStatCard
					value={formattedTime ? formattedTime.value : '??'}
					suffix={formattedTime ? formattedTime.unit : undefined}
					icon={Clock}
					colors={STAT_COLORS.readingTime}
				/>
			</View>
			<Divider />
		</View>
	)
}
