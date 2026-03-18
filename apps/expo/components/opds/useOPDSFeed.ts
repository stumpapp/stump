import { useSDK } from '@stump/client'
import { OPDSFeed, OPDSNavigationLink, OPDSPublication } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { hasLinkRel } from './utils'

export type PaginationTarget = 'publications' | 'navigation' | null

type UseOPDSFeedParams = {
	url?: string
}

export function useOPDSFeed({ url }: UseOPDSFeedParams) {
	const { sdk } = useSDK()

	const getNextPageParam = (lastPage: OPDSFeed) => {
		const links = lastPage.links || []
		const nextLink = links.find((link) => hasLinkRel(link, 'next'))
		return nextLink?.href
	}

	const { data, ...rest } = useInfiniteQuery({
		initialPageParam: url,
		queryKey: [sdk.opds.keys.feed, url, 'paged'],
		queryFn: ({ pageParam }) => sdk.opds.feed(pageParam || url || ''),
		placeholderData: keepPreviousData,
		getNextPageParam,
		enabled: !!url,
		throwOnError: false,
	})

	const feed = data?.pages.at(0)

	const paginationTarget: PaginationTarget = useMemo(() => {
		if (!feed) return null
		if (feed.publications.length > 0) return 'publications'
		if (feed.navigation.length > 0) return 'navigation'
		return null
	}, [feed])

	const publications: OPDSPublication[] = useMemo(
		() => data?.pages.flatMap((page) => page.publications) ?? [],
		[data],
	)

	const navigation: OPDSNavigationLink[] = useMemo(
		() => data?.pages.flatMap((page) => page.navigation) ?? [],
		[data],
	)

	return {
		feed,
		paginationTarget,
		publications,
		navigation,
		...rest,
	}
}
