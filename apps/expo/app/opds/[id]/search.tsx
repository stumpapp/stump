import { useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MaybeErrorFeed, OPDSFeed } from '~/components/opds'
import EmptyFeed from '~/components/opds/EmptyFeed'
import RefreshControl from '~/components/RefreshControl'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { url: feedURL, query } = useLocalSearchParams<{ url: string; query: string }>()
	const { sdk } = useSDK()
	const {
		data: feed,
		isLoading,
		refetch,
		isRefetching,
		error,
	} = useQuery({
		queryKey: [sdk.opds.keys.feed, feedURL],
		queryFn: () => sdk.opds.feed(feedURL),
		throwOnError: false,
	})

	const navigation = useNavigation()
	useDynamicHeader({
		title: query || 'Search Results',
		headerLeft: () => <ChevronLeft onPress={() => navigation.goBack()} />,
	})

	const emptyFeed =
		!feed?.groups?.length && !feed?.publications?.length && !feed?.navigation?.length

	const render = () => {
		if (emptyFeed) {
			return <EmptyFeed message="No results for this search" />
		} else if (feed) {
			return <OPDSFeed feed={feed} />
		} else {
			return <MaybeErrorFeed error={error} />
		}
	}

	if (isLoading) return null

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 gap-5 bg-background px-6"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				{render()}
			</ScrollView>
		</SafeAreaView>
	)
}
