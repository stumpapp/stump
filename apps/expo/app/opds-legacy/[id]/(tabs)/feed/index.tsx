import { FlashList } from '@shopify/flash-list'
import { useRefetch, useShowSlowLoader } from '@stump/client'

import { useActiveServer } from '~/components/activeServer'
import ChevronBackLink from '~/components/ChevronBackLink'
import {
	MaybeErrorLegacyFeed,
	OPDSLegacyEntryDivider,
	OPDSLegacyEntryItem,
	OPDSLegacyFeedActionMenu,
} from '~/components/opdsLegacy'
import { useLegacyOPDSEntrySize } from '~/components/opdsLegacy/useLegacyOPDSEntrySize'
import RefreshControl from '~/components/RefreshControl'
import { FullScreenLoader } from '~/components/ui'
import { useOPDSLegacyFeedContext } from '~/context/opdsLegacy'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useLegacyOPDSFeed } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { catalogMeta } = useOPDSLegacyFeedContext()
	const {
		feed, // The current page feed
		entries,
		refetch,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
	} = useLegacyOPDSFeed({ url: catalogMeta?.url || '' })
	const [isRefetching, onRefetch] = useRefetch(refetch)
	const showLoader = useShowSlowLoader(isLoading)

	const { numColumns } = useLegacyOPDSEntrySize()

	useDynamicHeader({
		title: activeServer?.name || 'OPDS Feed',
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

	if (!feed || !!error) return <MaybeErrorLegacyFeed error={error} onRetry={onRefetch} />

	return (
		<FlashList
			key={`catalog-root-${numColumns}`}
			data={entries}
			numColumns={numColumns}
			keyExtractor={(item, index) => `${item.id}-${index}`}
			renderItem={({ item }) => <OPDSLegacyEntryItem entry={item} />}
			contentContainerStyle={{
				paddingVertical: 16,
			}}
			contentInsetAdjustmentBehavior="always"
			onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
			onEndReached={onEndReached}
			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
			ItemSeparatorComponent={() => <OPDSLegacyEntryDivider />}
		/>
	)
}
