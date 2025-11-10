import { useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MaybeErrorFeed, OPDSFeed, OPDSPublicationFeed } from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()
	const {
		data: feed,
		refetch,
		isRefetching,
		isLoading,
		error,
	} = useQuery({
		queryKey: [sdk.opds.keys.feed, feedURL],
		queryFn: () => sdk.opds.feed(feedURL),
		throwOnError: false,
	})

	const insets = useSafeAreaInsets()

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} />

	const isPublicationFeed = feed.publications.length > 0

	if (isPublicationFeed) {
		return <OPDSPublicationFeed feed={feed} onRefresh={refetch} isRefreshing={isRefetching} />
	} else {
		return (
			<ScrollView
				className="flex-1 bg-background"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={{
					paddingBottom: insets.bottom,
				}}
			>
				<OPDSFeed feed={feed} />
			</ScrollView>
		)
	}
}
