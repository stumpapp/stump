import { OPDSFeed, OPDSNavigationLink, OPDSPublication } from '@stump/sdk'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import RefreshControl from '../RefreshControl'
import FeedContent from './FeedContent'
import MaybeErrorFeed from './MaybeErrorFeed'
import NavigationFeed from './NavigationFeed'
import PublicationFeed from './PublicationFeed'
import { FeedComponentOptions } from './types'
import { PaginationTarget } from './useOPDSFeed'

type Props = {
	feed: OPDSFeed
	paginationTarget?: PaginationTarget
	publications?: OPDSPublication[]
	navigation?: OPDSNavigationLink[]
	hasNextPage?: boolean
	fetchNextPage?: () => void
	onRefresh?: () => void
	isRefreshing?: boolean
} & FeedComponentOptions

const noop = () => {}

export default function Feed({
	feed,
	paginationTarget = null,
	publications = feed.publications,
	navigation = feed.navigation,
	hasNextPage = false,
	fetchNextPage = noop,
	onRefresh,
	isRefreshing,
	...options
}: Props) {
	const insets = useSafeAreaInsets()

	if (paginationTarget === 'publications') {
		const content = <FeedContent feed={feed} skipNavigation={false} {...options} />
		return (
			<PublicationFeed
				publications={publications}
				hasNextPage={hasNextPage}
				fetchNextPage={fetchNextPage}
				onRefresh={onRefresh}
				isRefreshing={isRefreshing}
				ListHeaderComponent={content}
			/>
		)
	}

	if (paginationTarget === 'navigation') {
		const content = <FeedContent feed={feed} skipNavigation {...options} />
		return (
			<NavigationFeed
				navigation={navigation}
				hasNextPage={hasNextPage}
				fetchNextPage={fetchNextPage}
				onRefresh={onRefresh}
				isRefreshing={isRefreshing}
				ListHeaderComponent={content}
			/>
		)
	}

	const content = <FeedContent feed={feed} {...options} />

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
