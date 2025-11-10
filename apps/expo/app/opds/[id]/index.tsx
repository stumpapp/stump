import { useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import partition from 'lodash/partition'
import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import ChevronBackLink from '~/components/ChevronBackLink'
import {
	MaybeErrorFeed,
	OPDSNavigation,
	OPDSNavigationGroup,
	OPDSPublicationGroup,
} from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'
import { FullScreenLoader } from '~/components/ui'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { sdk } = useSDK()
	const {
		data: feed,
		isLoading,
		refetch,
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
	const [isRefetching, setIsRefetching] = useState(false)

	const onRefetch = useCallback(async () => {
		setIsRefetching(true)
		try {
			await refetch()
		} finally {
			setIsRefetching(false)
		}
	}, [refetch])

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

	useDynamicHeader({
		title: activeServer?.name || 'OPDS Feed',
		headerLeft: () => <ChevronBackLink />,
		headerSearchBarOptions: hasSearch
			? {
					placeholder: 'Search',
					// @ts-expect-error: NativeSearchBarEvent
					onChangeText: (e) => setQuery(e.nativeEvent.text),
					shouldShowHintSearchIcon: true,
					onSearchButtonPress: () => onSearch(),
				}
			: undefined,
	})

	const insets = useSafeAreaInsets()

	if (isLoading) return <FullScreenLoader label="Loading..." />

	if (!feed || !!error) return <MaybeErrorFeed error={error} />

	const [navGroups, publicationGroups] = partition(
		feed.groups.filter((group) => group.navigation.length || group.publications.length),
		(group) => group.publications.length === 0,
	)

	if (!navGroups.length && !publicationGroups.length && !feed.navigation.length) {
		return <MaybeErrorFeed />
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
