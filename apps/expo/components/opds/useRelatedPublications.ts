import { useSDK } from '@stump/client'
import { OPDSEntryBelongsTo, OPDSFeed, OPDSPublication } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'

import { getBelongsToPosition } from './utils'

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
		const nextLink = links.find((link) => link.rel === 'next')
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
		return feed.filter((entry) => entry.links?.some((link) => link.rel === 'self'))
	}

	const seriesPublications = intoPublications(seriesFeed) ?? []
	const collectionPublications = intoPublications(collectionFeed) ?? []

	const keyExtractor = (entry: OPDSPublication, index: number) => {
		const selfHref = entry.links?.find((link) => link.rel === 'self')?.href
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

const getInitialIndex = (position: number | null, listLength: number) => {
	if (!position) return 0
	const index = position - 1
	return Math.min(Math.max(0, index), listLength - 1)
}
