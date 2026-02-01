import { FlashList } from '@shopify/flash-list'
import { useRefetch } from '@stump/client'
import partition from 'lodash/partition'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import ChevronBackLink from '~/components/ChevronBackLink'
import {
	FeedSubtitle,
	MaybeErrorFeed,
	OPDSNavigation,
	OPDSNavigationGroup,
	OPDSPublicationGroup,
} from '~/components/opds'
import { OPDSLegacyEntryItem } from '~/components/opdsLegacy'
import RefreshControl from '~/components/RefreshControl'
import { FullScreenLoader, Text } from '~/components/ui'
import { useOPDSFeedContext } from '~/context/opds'
import { useOPDSLegacyFeedContext } from '~/context/opdsLegacy'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { catalog: feed, isLoading, error, refetch } = useOPDSLegacyFeedContext()
	const [isRefetching, onRefetch] = useRefetch(refetch)

	useDynamicHeader({
		title: activeServer?.name || 'OPDS Feed',
		headerLeft: () => <ChevronBackLink />,
	})

	const insets = useSafeAreaInsets()

	if (isLoading) return <FullScreenLoader label="Loading..." />

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

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
