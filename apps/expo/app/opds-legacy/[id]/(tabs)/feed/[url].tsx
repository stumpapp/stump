import { FlashList } from '@shopify/flash-list'
import { useRefetch, useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MaybeErrorFeed } from '~/components/opds'
import OPDSLegacyEntryItem from '~/components/opdsLegacy/OPDSLegacyEntryItem'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()
	// TODO: Pagination, probably will just make a special useLegacyOPDSFeed hook that will
	// handle the start/previous/next links to get infinite scrolling working
	const {
		data: feed,
		refetch,
		isLoading,
		error,
	} = useQuery({
		queryKey: [sdk.opds.keys.feed, feedURL],
		queryFn: () => sdk.opdsLegacy.feed(feedURL),
		throwOnError: false,
	})

	const insets = useSafeAreaInsets()
	const [isRefetching, onRefetch] = useRefetch(refetch)

	// useFeedTitle(feed)

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	// if (isPublicationFeed) {
	// 	return <OPDSPublicationFeed feed={feed} onRefresh={refetch} isRefreshing={isRefetching} />
	// } else {
	// 	return (
	// 		<ScrollView
	// 			className="flex-1 bg-background"
	// 			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
	// 			contentInsetAdjustmentBehavior="automatic"
	// 			contentContainerStyle={{
	// 				paddingBottom: insets.bottom,
	// 			}}
	// 		>
	// 			<OPDSFeed feed={feed} />
	// 		</ScrollView>
	// 	)
	// }

	return (
		<FlashList
			data={feed.entries}
			numColumns={3}
			keyExtractor={(item, index) => item.id || item.title || index.toString()}
			renderItem={({ item }) => <OPDSLegacyEntryItem entry={item} />}
			contentInsetAdjustmentBehavior="automatic"
		/>
	)
}
