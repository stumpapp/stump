import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { ContinueReading, OnDeck, RecentlyAddedBooks } from '~/components/activeServer/home'
import RecentlyAddedSeriesHorizontal from '~/components/activeServer/home/RecentlyAddedSeriesHorizontal'
import RefreshControl from '~/components/RefreshControl'

export default function Screen() {
	const [refreshing, setRefreshing] = useState(false)

	const client = useQueryClient()
	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		await Promise.all([
			client.invalidateQueries({ queryKey: ['continueReading'], exact: false }),
			client.invalidateQueries({ queryKey: ['onDeck'], exact: false }),
			client.invalidateQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
			client.invalidateQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
		])
		setRefreshing(false)
	}, [client])

	return (
		<ScrollView
			className="flex-1 bg-background p-4"
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			contentInsetAdjustmentBehavior="automatic"
		>
			<View className="flex flex-1 gap-8 pb-8">
				<ContinueReading />
				<OnDeck />
				<RecentlyAddedSeriesHorizontal />
				<RecentlyAddedBooks />
			</View>
		</ScrollView>
	)
}
