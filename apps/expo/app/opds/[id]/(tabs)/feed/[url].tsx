import { useRefetch, useShowSlowLoader } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'

import ChevronBackLink from '~/components/ChevronBackLink'
import { MaybeErrorFeed, OPDSFeed } from '~/components/opds'
import { useOPDSFeed } from '~/components/opds/useOPDSFeed'
import { FullScreenLoader } from '~/components/ui'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()

	const {
		feed,
		paginationTarget,
		publications,
		navigation,
		hasNextPage,
		fetchNextPage,
		isLoading,
		error,
		refetch,
	} = useOPDSFeed({ url: feedURL })

	const [isRefetching, onRefetch] = useRefetch(refetch)
	const showLoader = useShowSlowLoader(isLoading)

	useDynamicHeader({
		title: feed?.metadata.title || '',
		headerLeft: () => <ChevronBackLink />,
	})

	if (showLoader) return <FullScreenLoader label="Loading..." />

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	return (
		<OPDSFeed
			feed={feed}
			paginationTarget={paginationTarget}
			publications={publications}
			navigation={navigation}
			hasNextPage={hasNextPage}
			fetchNextPage={fetchNextPage}
			onRefresh={onRefetch}
			isRefreshing={isRefetching}
		/>
	)
}
