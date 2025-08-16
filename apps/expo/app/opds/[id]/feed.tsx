import { useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

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

	if (isLoading) return null

	if (!feed) return <MaybeErrorFeed error={error} />

	const isPublicationFeed = feed.publications.length > 0

	const renderContent = () => {
		if (isPublicationFeed) {
			return <OPDSPublicationFeed feed={feed} onRefresh={refetch} isRefreshing={isRefetching} />
		} else {
			return (
				<ScrollView
					className="flex-1 gap-5 bg-background px-6"
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				>
					<OPDSFeed feed={feed} />
				</ScrollView>
			)
		}
	}

	return <SafeAreaView className="flex-1 bg-background">{renderContent()}</SafeAreaView>
}
