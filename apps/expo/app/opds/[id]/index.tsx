import { useQuery, useSDK } from '@stump/client'
import partition from 'lodash/partition'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { OPDSNavigation, OPDSNavigationGroup, OPDSPublicationGroup } from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'
import { Heading, Input } from '~/components/ui'
import { useCallback } from 'react'
import { useRouter } from 'expo-router'

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

	const searchURL = feed?.links.find((link) => link.rel === 'search' && link.templated)?.href

	const router = useRouter()

	const onSearch = useCallback((query: string) => {
		if (!query || !searchURL) return

		const url = searchURL.replace('{?query}', `?query=${encodeURIComponent(query)}`)
		router.push({
			pathname: `/opds/[id]/search`,
			params: {
				id: activeServer.id,
				url,
				query,
			},
		})
	}, [])

	if (!feed) return null

	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	const hasSearch = feed.links.some((link) => link.rel === 'search')

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView
				className="flex-1 bg-background px-4"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			>
				<View className="flex-1 gap-6 tablet:gap-8">
					<Heading size="lg" className="mt-6">
						{activeServer?.name || 'OPDS Feed'}
					</Heading>

					{hasSearch && (
						<Input
							label="Search"
							placeholder="Search catalog"
							submitBehavior="blurAndSubmit"
							onEndEditing={(e) => onSearch(e.nativeEvent.text)}
						/>
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
		</SafeAreaView>
	)
}
