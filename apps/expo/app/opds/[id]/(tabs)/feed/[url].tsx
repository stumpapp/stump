import { useRefetch, useSDK, useShowSlowLoader } from '@stump/client'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import ChevronBackLink from '~/components/ChevronBackLink'
import { MaybeErrorFeed, OPDSFeed } from '~/components/opds'
import { FullScreenLoader } from '~/components/ui'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { url: feedURL } = useLocalSearchParams<{ url: string }>()
	const { sdk } = useSDK()
	const {
		data: feed,
		refetch,
		isLoading,
		error,
	} = useQuery({
		queryKey: [sdk.opds.keys.feed, feedURL],
		queryFn: () => sdk.opds.feed(feedURL),
		throwOnError: false,
	})

	const [isRefetching, onRefetch] = useRefetch(refetch)
	const showLoader = useShowSlowLoader(isLoading)

	useDynamicHeader({
		title: feed?.metadata.title || '',
		headerLeft: () => <ChevronBackLink />,
	})

	if (showLoader) return <FullScreenLoader label="Loading..." />

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	return <OPDSFeed feed={feed} onRefresh={onRefetch} isRefreshing={isRefetching} />
}
