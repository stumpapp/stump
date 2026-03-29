import { useRefetch, useSDK } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import ChevronBackLink from '~/components/ChevronBackLink'
import EmptyState from '~/components/EmptyState'
import { MaybeErrorFeed, OPDSFeed } from '~/components/opds'
import { PaginationTarget } from '~/components/opds/useOPDSFeed'
import { useOPDSFeedContext } from '~/context/opds'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { constructSearchURL } from '~/lib/opdsUtils'

export default function Screen() {
	const { query } = useLocalSearchParams<{ query: string }>()
	const { sdk } = useSDK()
	const { searchURL } = useOPDSFeedContext()

	const feedURL = searchURL && query ? constructSearchURL(searchURL, query) : undefined

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

	if (isLoading) return null

	const emptyFeed =
		!feed?.groups?.length && !feed?.publications?.length && !feed?.navigation?.length

	if (emptyFeed) {
		return <EmptyState title="Empty Feed" message="Your search returned no results" />
	}

	if (!feed || !!error) {
		return <MaybeErrorFeed error={error} onRetry={onRefetch} />
	}

	const paginationTarget: PaginationTarget =
		feed.publications.length > 0 ? 'publications' : feed.navigation.length > 0 ? 'navigation' : null

	return (
		<OPDSFeed
			feed={feed}
			paginationTarget={paginationTarget}
			publications={feed.publications}
			navigation={feed.navigation}
			onRefresh={onRefetch}
			isRefreshing={isRefetching}
		/>
	)
}
