import { useRefetch, useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { Rss } from 'lucide-react-native'
import { Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ChevronBackLink from '~/components/ChevronBackLink'
import { MaybeErrorFeed, OPDSFeed } from '~/components/opds'
import RefreshControl from '~/components/RefreshControl'
import { ListEmptyMessage } from '~/components/ui'
import { useOPDSFeedContext } from '~/context/opds'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { query } = useLocalSearchParams<{ query: string }>()
	const { sdk } = useSDK()
	const { searchURL } = useOPDSFeedContext()

	const feedURL = searchURL?.replace('{?query}', `?query=${encodeURIComponent(query || '')}`)

	const {
		data: feed,
		isLoading,
		refetch,
		error,
	} = useQuery({
		queryKey: [sdk.opds.keys.feed, feedURL],
		queryFn: () => sdk.opds.feed(feedURL || ''),
		enabled: !!feedURL,
		throwOnError: false,
	})

	const [isRefetching, onRefetch] = useRefetch(refetch)

	useDynamicHeader({
		title: query || 'Search Results',
		headerLeft: () => <ChevronBackLink />,
	})

	const emptyFeed =
		!feed?.groups?.length && !feed?.publications?.length && !feed?.navigation?.length

	const render = () => {
		if (emptyFeed) {
			return <ListEmptyMessage icon={Rss} message="No results for this search" />
		} else if (feed && !error) {
			return <OPDSFeed feed={feed} />
		} else {
			return <MaybeErrorFeed error={error} onRetry={onRefetch} />
		}
	}

	if (isLoading) return null

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 gap-5 bg-background"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				{render()}
			</ScrollView>
		</SafeAreaView>
	)
}
