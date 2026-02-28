import { OPDSFeed, resolveUrl } from '@stump/sdk'
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

export type OPDSFeedContextValue = {
	catalog: OPDSFeed | null
	searchURL: string | undefined
	hasSearch: boolean
	isLoading: boolean
	error: unknown | null
	refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<OPDSFeed | undefined, Error>>
	// TODO: Should facets be a tab?
	// TODO: Should navigation be a `Browse` tab?
	// ^ I think depends on how curated-feeling we want the OPDS flow to be
	// I feel like it currently has more of a "as returned by server" feeling
	// rather than identifying core bits and surfacing them as independent paths (tabs)
}

export const OPDSFeedContext = createContext<OPDSFeedContextValue | null>(null)

export const useOPDSFeedContext = () => {
	const context = useContext(OPDSFeedContext)
	if (!context) {
		throw new Error('useOPDSFeedContext must be used within an OPDSFeedContextProvider')
	}
	return context
}

export const getSearchURL = (feed: OPDSFeed | null | undefined, rootURL: string | undefined) => {
	const searchLink = feed?.links.find((link) => link.rel === 'search' && link.templated)?.href
	return searchLink ? resolveUrl(searchLink, rootURL) : undefined
}

export const feedHasSearch = (feed: OPDSFeed | null | undefined) =>
	feed?.links.some((link) => link.rel === 'search') ?? false
