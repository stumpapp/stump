import { useRefetch, useShowSlowLoader } from '@stump/client'
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
import RefreshControl from '~/components/RefreshControl'
import { FullScreenLoader } from '~/components/ui'
import { useOPDSFeedContext } from '~/context/opds'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { catalog: feed, isLoading, error, refetch } = useOPDSFeedContext()
	const [isRefetching, onRefetch] = useRefetch(refetch)
	const showLoader = useShowSlowLoader(isLoading)

	useDynamicHeader({
		title: activeServer?.name || 'OPDS Feed',
		headerLeft: () => <ChevronBackLink />,
	})

	const insets = useSafeAreaInsets()

	if (showLoader) return <FullScreenLoader label="Loading..." />

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	if (!navGroups.length && !publicationGroups.length && !feed.navigation.length) {
		return <MaybeErrorFeed onRetry={onRefetch} />
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
			contentInsetAdjustmentBehavior="automatic"
			contentContainerStyle={{
				paddingBottom: insets.bottom,
			}}
		>
			<View className="mt-6 flex-1 gap-6 tablet:gap-8">
				{feed.metadata.subtitle && (
					<View className="-mt-2 px-4 tablet:-mt-4">
						<FeedSubtitle value={feed.metadata.subtitle} />
					</View>
				)}

				<OPDSNavigation navigation={feed.navigation} renderEmpty />

				{navGroups.map((group) => (
					<OPDSNavigationGroup key={group.metadata.title} group={group} renderEmpty />
				))}

				{publicationGroups.map((group) => (
					<OPDSPublicationGroup key={group.metadata.title} group={group} renderEmpty />
				))}
			</View>
		</ScrollView>
	)
}
