import { OPDSFeed } from '@stump/sdk'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import RefreshControl from '../RefreshControl'
import FeedContent from './FeedContent'
import MaybeErrorFeed from './MaybeErrorFeed'
import PublicationFeed from './PublicationFeed'
import { FeedComponentOptions } from './types'

type Props = {
	feed: OPDSFeed
	onRefresh?: () => void
	isRefreshing?: boolean
} & FeedComponentOptions

export default function Feed({ feed, onRefresh, isRefreshing, ...options }: Props) {
	const insets = useSafeAreaInsets()

	const content = <FeedContent feed={feed} {...options} />

	if (feed.publications?.length > 0) {
		return (
			<PublicationFeed
				feed={feed}
				onRefresh={onRefresh}
				isRefreshing={isRefreshing}
				ListHeaderComponent={content}
			/>
		)
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			refreshControl={<RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />}
			contentInsetAdjustmentBehavior="automatic"
			contentContainerStyle={{ paddingBottom: insets.bottom }}
		>
			{content || <MaybeErrorFeed />}
		</ScrollView>
	)
}
