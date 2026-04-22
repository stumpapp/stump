import { useSDK } from '@stump/client'
import { OPDSEntryBelongsTo, OPDSFeed, OPDSPublication } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'

import { getBelongsToPosition, hasLinkRel } from './utils'

type UseRelatedPublicationsParams = {
	seriesUrl?: string | null
	collectionUrl?: string | null
	belongsTo?: OPDSEntryBelongsTo | null
}

export function useRelatedPublications({
	seriesUrl,
	collectionUrl,
	belongsTo,
}: UseRelatedPublicationsParams) {
	const { sdk } = useSDK()

	const getNextPageParam = (lastPage: OPDSFeed) => {
		const links = lastPage.links || []
		const nextLink = links.find((link) => hasLinkRel(link, 'next'))
		if (nextLink) {
			return nextLink.href
		}
		return undefined
	}

	// I wish there was useInfiniteQueries :sob:

	const seriesQuery = useInfiniteQuery({
		initialPageParam: seriesUrl,
		queryKey: [sdk.opds.keys.feed, seriesUrl, 'series-publications'],
		queryFn: ({ pageParam = seriesUrl }) => {
			return sdk.opds.feed(pageParam || '')
		},
		placeholderData: keepPreviousData,
		getNextPageParam,
		enabled: !!seriesUrl,
	})

	const collectionQuery = useInfiniteQuery({
		initialPageParam: collectionUrl,
		queryKey: [sdk.opds.keys.feed, collectionUrl, 'collection-publications'],
		queryFn: ({ pageParam = collectionUrl }) => {
			return sdk.opds.feed(pageParam || '')
		},
		placeholderData: keepPreviousData,
		getNextPageParam,
		enabled: !!collectionUrl,
	})

	const seriesFeed = seriesQuery.data?.pages.flatMap((page) => page.publications)
	const collectionFeed = collectionQuery.data?.pages.flatMap((page) => page.publications)

	const intoPublications = (feed: typeof seriesFeed | typeof collectionFeed) => {
		if (!feed?.length) return null
		return feed.filter((entry) => entry.links?.some((link) => hasLinkRel(link, 'self')))
	}

	const seriesPublications = intoPublications(seriesFeed) ?? []
	const collectionPublications = intoPublications(collectionFeed) ?? []

	const keyExtractor = (entry: OPDSPublication, index: number) => {
		const selfHref = entry.links?.find((link) => hasLinkRel(link, 'self'))?.href
		return selfHref || entry.metadata.identifier || `${entry.metadata.title}-${index}`
	}

	return {
		seriesPublications,
		initialSeriesPublicationIndex: getInitialIndex(
			getBelongsToPosition(belongsTo, 'series'),
			seriesPublications.length,
		),
		hasMoreSeriesPublications: !!seriesQuery.hasNextPage,
		fetchMoreSeriesPublications: seriesQuery.fetchNextPage,
		collectionPublications,
		initialCollectionPublicationIndex: getInitialIndex(
			getBelongsToPosition(belongsTo, 'collection'),
			collectionPublications.length,
		),
		hasMoreCollectionPublications: !!collectionQuery.hasNextPage,
		fetchMoreCollectionPublications: collectionQuery.fetchNextPage,
		keyExtractor,
	}
}

// this is at best a heuristic, since position is determined by either metadata.number or ranking media in series
// alphabetically by name, but it should work in most cases and is better than nothing. the scenarios i can see
// where it would be wrong are:
// - incomplete books in series
// - books with metadata.number that is not a whole number (e.g. 1.5)
// also by nature of infinite scrolling, the book might not even be in the initial window
const getInitialIndex = (position: number | null, listLength: number) => {
	if (!position) return 0
	const index = Math.floor(position) - 1
	return Math.min(Math.max(0, index), listLength - 1)
}
