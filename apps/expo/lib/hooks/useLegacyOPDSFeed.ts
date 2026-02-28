import { useSDK } from '@stump/client'
import { resolveUrl } from '@stump/sdk'
import { useInfiniteQuery } from '@tanstack/react-query'

type Params = {
	url?: string
}

export function useLegacyOPDSFeed({ url }: Params) {
	const { sdk } = useSDK()
	const { data, ...rest } = useInfiniteQuery({
		initialPageParam: url,
		queryKey: [sdk.opds.keys.feed, url],
		queryFn: ({ pageParam: pageURL }) =>
			sdk.opdsLegacy.feed(resolveUrl(pageURL || '', sdk.rootURL)),
		getNextPageParam: (lastPage) => {
			const nextLink = lastPage.links.find((link) => link.rel === 'next')
			if (nextLink) {
				return nextLink.href
			}
			return undefined
		},
		throwOnError: false,
		enabled: !!url,
	})

	const feedEntries = (data?.pages.flatMap((page) => page.entries) || []).filter(Boolean)

	const currentFeed = data?.pages[data.pages.length - 1]

	return {
		data,
		feed: currentFeed,
		entries: feedEntries,
		...rest,
	}
}
