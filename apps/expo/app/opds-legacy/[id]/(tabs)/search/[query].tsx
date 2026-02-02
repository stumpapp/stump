import { FlashList } from '@shopify/flash-list'
import { useRefetch } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import EmptyState from '~/components/EmptyState'
import { MaybeErrorFeed } from '~/components/opds'
import { OPDSLegacyEntryItem } from '~/components/opdsLegacy'
import RefreshControl from '~/components/RefreshControl'
import { useOPDSLegacyFeedContext } from '~/context/opdsLegacy'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useLegacyOPDSFeed } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { constructLegacySearchURL } from '~/lib/opdsUtils'

export default function Screen() {
	const { query } = useLocalSearchParams<{ query: string }>()
	const { searchDoc } = useOPDSLegacyFeedContext()

	const firstSearchUrl = searchDoc?.Urls.at(0)?.template || ''
	const feedURL =
		firstSearchUrl && query ? constructLegacySearchURL(firstSearchUrl, query) : undefined

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

	useDynamicHeader({
		title: query || 'Search Results',
		headerLeft: () => <ChevronBackLink />,
	})

	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	if (!entries.length) {
		return <EmptyState title="Empty Feed" message="Your search returned no results" />
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
