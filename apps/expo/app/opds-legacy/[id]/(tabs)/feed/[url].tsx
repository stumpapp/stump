import { FlashList } from '@shopify/flash-list'
import { useRefetch } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import EmptyState from '~/components/EmptyState'
import { MaybeErrorLegacyFeed } from '~/components/opdsLegacy'
import OPDSLegacyEntryItem from '~/components/opdsLegacy/OPDSLegacyEntryItem'
import RefreshControl from '~/components/RefreshControl'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useLegacyOPDSFeed } from '~/lib/hooks'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const {
		feed, // The current page feed
		entries,
		refetch,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
	} = useLegacyOPDSFeed({ url: feedURL })

	const [isRefetching, onRefetch] = useRefetch(refetch)

	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorLegacyFeed error={error} onRetry={onRefetch} />

	if (!entries.length) {
		return <EmptyState title="Nothing to show" message="No entries were returned for this feed" />
	}

	return (
		<FlashList
			data={entries}
			numColumns={3}
			keyExtractor={(item, index) => item.id || item.title || index.toString()}
			renderItem={({ item }) => <OPDSLegacyEntryItem entry={item} />}
			contentContainerStyle={{
				paddingVertical: 16,
			}}
			contentInsetAdjustmentBehavior="automatic"
			onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
			onEndReached={onEndReached}
			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
			ItemSeparatorComponent={() => <View className="h-4" />}
		/>
	)
}
