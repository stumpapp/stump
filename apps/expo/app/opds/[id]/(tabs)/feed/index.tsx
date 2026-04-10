import { useRefetch, useShowSlowLoader } from '@stump/client'

import { useActiveServer } from '~/components/activeServer'
import BackLink from '~/components/BackLink'
import { MaybeErrorFeed, OPDSFeed } from '~/components/opds'
import { FullScreenLoader } from '~/components/ui'
import { useOPDSFeedContext } from '~/context/opds'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	const { activeServer } = useActiveServer()
	const { catalog: feed, isLoading, error, refetch } = useOPDSFeedContext()
	const [isRefetching, onRefetch] = useRefetch(refetch)
	const showLoader = useShowSlowLoader(isLoading)

	useDynamicHeader({
		title: activeServer?.name,
		headerLeft: () => <BackLink />,
	})

	if (showLoader) return <FullScreenLoader label="Loading..." />

	if (isLoading) return null

	if (!feed || !!error) return <MaybeErrorFeed error={error} onRetry={onRefetch} />

	return <OPDSFeed feed={feed} onRefresh={onRefetch} isRefreshing={isRefetching} renderEmpty />
}
