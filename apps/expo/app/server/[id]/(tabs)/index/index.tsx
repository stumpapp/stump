import { useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { ContinueReading, OnDeck, RecentlyAddedBooks } from '~/components/activeServer/home'
import RecentlyAddedSeriesHorizontal from '~/components/activeServer/home/RecentlyAddedSeriesHorizontal'
import RefreshControl from '~/components/RefreshControl'

export default function Screen() {
	const [refreshing, setRefreshing] = useState(false)

	const client = useQueryClient()
	const onRefresh = useCallback(
		async (isBackground = false) => {
			setRefreshing(!isBackground)
			await Promise.all([
				client.invalidateQueries({ queryKey: ['continueReading'], exact: false }),
				client.invalidateQueries({ queryKey: ['onDeck'], exact: false }),
				client.invalidateQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
				client.invalidateQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
			])
			setRefreshing(false)
		},
		[client],
	)

	// Always refresh when we come back to this screen
	useFocusEffect(
		useCallback(
			() => {
				onRefresh(true)
			},
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[],
		),
	)

	return (
		<ScrollView
			className="flex-1 bg-background"
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			contentInsetAdjustmentBehavior="always"
		>
			<View className="flex flex-1 gap-4 pt-4">
				<ContinueReading />
				<OnDeck />
				<RecentlyAddedSeriesHorizontal />
				<RecentlyAddedBooks />
			</View>
		</ScrollView>
	)
}
