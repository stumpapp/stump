import { FlashList } from '@shopify/flash-list'
import { useRefetch, useShowSlowLoader } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'

import EmptyState from '~/components/EmptyState'
import {
	MaybeErrorLegacyFeed,
	OPDSLegacyEntryDivider,
	OPDSLegacyFeedActionMenu,
} from '~/components/opdsLegacy'
import OPDSLegacyEntryItem from '~/components/opdsLegacy/OPDSLegacyEntryItem'
import { useLegacyOPDSEntrySize } from '~/components/opdsLegacy/useLegacyOPDSEntrySize'
import RefreshControl from '~/components/RefreshControl'
import { FullScreenLoader } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useLegacyOPDSFeed } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

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
	const { numColumns } = useLegacyOPDSEntrySize()

	const [isRefetching, onRefetch] = useRefetch(refetch)
	const showLoader = useShowSlowLoader(isLoading)

	useDynamicHeader({
		title: feed?.title || '',
		headerRight: () => <OPDSLegacyFeedActionMenu />,
	})

	const onEndReached = () => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}

	if (showLoader) return <FullScreenLoader label="Loading..." />

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorLegacyFeed error={error} onRetry={onRefetch} />

	if (!entries.length) {
		return <EmptyState title="Nothing to show" message="No entries were returned for this feed" />
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
			ItemSeparatorComponent={() => <OPDSLegacyEntryDivider />}
		/>
	)
}
