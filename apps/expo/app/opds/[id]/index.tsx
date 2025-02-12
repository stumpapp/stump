import { useQuery, useSDK } from '@stump/client'
import partition from 'lodash/partition'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { useActiveServer } from '~/components/activeServer'
import { OPDSNavigation, OPDSNavigationGroup, OPDSPublicationGroup } from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'
import { Heading } from '~/components/ui'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { sdk } = useSDK()
	const {
		data: feed,
		refetch,
		isRefetching,
	} = useQuery([sdk.opds.keys.catalog, activeServer?.id], () => sdk.opds.catalog(), {
		suspense: true,
	})

	if (!feed) return null

	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	return (
		<ScrollView
			className="flex-1 bg-background p-4"
			refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
		>
			<View className="flex-1 gap-6 tablet:gap-8">
				<Heading size="lg" className="mt-6">
					{activeServer?.name || 'OPDS Feed'}
				</Heading>

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
