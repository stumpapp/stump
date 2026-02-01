import { isPseStreamLink, resolveUrl } from '@stump/sdk'
import { OPDSLegacyEntry, OPDSLegacyFeed } from '@stump/sdk'
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

export type OPDSLegacyFeedContextValue = {
	catalog: OPDSLegacyFeed | null
	searchURL: string | undefined
	hasSearch: boolean
	isLoading: boolean
	error: unknown | null
	refetch: (
		options?: RefetchOptions,
	) => Promise<QueryObserverResult<OPDSLegacyFeed | undefined, Error>>
}

export const OPDSLegacyFeedContext = createContext<OPDSLegacyFeedContextValue | null>(null)

export const useOPDSLegacyFeedContext = () => {
	const context = useContext(OPDSLegacyFeedContext)
	if (!context) {
		throw new Error('useOPDSLegacyFeedContext must be used within an OPDSLegacyFeedContextProvider')
	}
	return context
}

export const getLegacySearchURL = (
	feed: OPDSLegacyFeed | null | undefined,
	rootURL: string | undefined,
) => {
	const searchLink = feed?.links.find((link) => link.rel === 'search')?.href
	return searchLink ? resolveUrl(searchLink, rootURL) : undefined
}

export const feedLegacyHasSearch = (feed: OPDSLegacyFeed | null | undefined) =>
	feed?.links.some((link) => link.rel === 'search') ?? false

export const getLegacyPageStreamingURL = (entry: OPDSLegacyEntry, rootURL: string | undefined) => {
	const streamingLink = entry.links.find(isPseStreamLink)?.href
	return streamingLink ? resolveUrl(streamingLink, rootURL) : undefined
}
