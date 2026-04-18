import { BooksScreenStatsQuery } from '@stump/graphql'
import { formatHumanDurationSeparate } from '@stump/i18n'
import { Stack, useNavigation } from 'expo-router'
import { BookCheck, BookOpen, Clock, Layers } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, View } from 'react-native'

import { Divider } from '~/components/Divider'
import { MiniStatCard } from '~/components/StatCard'
import { STAT_COLORS } from '~/lib/constants'

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
	const sortAndDisplayMenu = useBooksSortAndDisplayMenu()
	// const filterMenu = useSeriesFilterMenu()

	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => (
					<View className="gap-2 flex-row">
						{/*{filterMenu}*/}
						{sortAndDisplayMenu}
					</View>
				),
			})
		}
	}, [navigation, sortAndDisplayMenu])

	if (Platform.OS === 'ios') {
		// fixme: it seems like two toolbar menu actions in one toolbar
		// is causing onPress issues???
		return (
			<Stack.Toolbar placement="right">
				{/*{filterMenu}*/}
				{sortAndDisplayMenu}
			</Stack.Toolbar>
		)
	}

	return null
}
