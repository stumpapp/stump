import { useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useNavigation, useRouter } from 'expo-router'
import partition from 'lodash/partition'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Platform, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import {
	MaybeErrorFeed,
	OPDSNavigation,
	OPDSNavigationGroup,
	OPDSPublicationGroup,
} from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'
import { Heading } from '~/components/ui'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { sdk } = useSDK()
	const {
		data: feed,
		refetch,
		isRefetching,
		error,
	} = useQuery({
		queryKey: [sdk.opds.keys.catalog, activeServer?.id],
		queryFn: () => {
			if (activeServer.stumpOPDS) {
				return sdk.opds.catalog()
			} else {
				return sdk.opds.feed(activeServer.url)
			}
		},
		throwOnError: false,
	})

	const searchURL = feed?.links.find((link) => link.rel === 'search' && link.templated)?.href

	const router = useRouter()

	const [query, setQuery] = useState('')

	const onSearch = useCallback(() => {
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
	}, [activeServer.id, router, searchURL, query])

	const hasSearch = feed?.links.some((link) => link.rel === 'search')

	const navigation = useNavigation()
	useDynamicHeader({
		title: activeServer?.name || 'OPDS Feed',
		headerLeft: () => <ChevronLeft onPress={() => navigation.goBack()} />,
		headerSearchBarOptions: hasSearch
			? {
					placeholder: 'Search',
					onChangeText: (e) => setQuery(e.nativeEvent.text),
					shouldShowHintSearchIcon: true,
					onSearchButtonPress: () => onSearch(),
				}
			: undefined,
	})

	if (!feed) return <MaybeErrorFeed error={error} />

	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 bg-background px-4"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
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
		</SafeAreaView>
	)
}
