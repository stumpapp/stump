import { FlashList } from '@shopify/flash-list'
import { useRefetch, useShowSlowLoader } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import EmptyState from '~/components/EmptyState'
import { MaybeErrorFeed } from '~/components/opds'
import { OPDSLegacyEntryItem, OPDSLegacyFeedActionMenu } from '~/components/opdsLegacy'
import { useLegacyOPDSEntrySize } from '~/components/opdsLegacy/useLegacyOPDSEntrySize'
import RefreshControl from '~/components/RefreshControl'
import { FullScreenLoader } from '~/components/ui'
import { useOPDSLegacyFeedContext } from '~/context/opdsLegacy'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useLegacyOPDSFeed } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { constructLegacySearchURL } from '~/lib/opdsUtils'

export default function Screen() {
	const { query } = useLocalSearchParams<{ query: string }>()
	const { searchDoc } = useOPDSLegacyFeedContext()
	const { numColumns } = useLegacyOPDSEntrySize()

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
	const showLoader = useShowSlowLoader(isLoading)

	useDynamicHeader({
		title: query || 'Search Results',
		headerLeft: () => <ChevronBackLink />,
		headerRight: () => <OPDSLegacyFeedActionMenu />,
	})

	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	if (showLoader) return <FullScreenLoader label="Loading..." />

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	if (!entries.length) {
		return <EmptyState title="Empty Feed" message="Your search returned no results" />
	}

	return (
		<FlashList
			key={`feed-root-${numColumns}`}
			data={entries}
			numColumns={numColumns}
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
