import { useQuery, useSDK } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView, ScrollView, View } from 'react-native'
import { OPDSFeed } from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'
import { Text } from '~/components/ui'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()
	const {
		data: feed,
		isLoading,
		refetch,
		isRefetching,
	} = useQuery([sdk.opds.keys.feed, feedURL], () => sdk.opds.feed(feedURL), {
		suspense: true,
		useErrorBoundary: false,
	})

	const emptyFeed =
		!feed?.groups?.length && !feed?.publications?.length && !feed?.navigation?.length

	if (emptyFeed && !isLoading) {
		return (
			<View>
				<Text>No results for this search</Text>
			</View>
		)
	}

	if (!feed) return null

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView
				className="flex-1 gap-5 bg-background px-6"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			>
				<OPDSFeed feed={feed} />
			</ScrollView>
		</SafeAreaView>
	)
}
