import { isPseStreamLink, OPDSLegacyOpenSearchDoc, resolveUrl } from '@stump/sdk'
import { OPDSLegacyEntry, OPDSLegacyFeed } from '@stump/sdk'
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query'
import { createContext, useContext } from 'react'

export type OPDSLegacyCatalogMeta = Pick<OPDSLegacyFeed, 'id' | 'title' | 'author'> & {
	url: string | undefined
}

export type OPDSLegacyFeedContextValue = {
	catalogMeta: OPDSLegacyCatalogMeta | null
	searchDoc: OPDSLegacyOpenSearchDoc | null
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

export const getLegacySearchDocumentURL = (
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

export type OPDSLegacyStreamingContextValue = {
	entryId: string
	entryTitle: string
	entryContent: string
	streamingURL: string
	pageCount: number
	// TODO: I _could_ use this for resuming, but is that the best way?
	// It doesn't necessarily sync back as you progress, depends on server,
	// sooooo
	// currentPage?: number
}

export const OPDSLegacyStreamingContext = createContext<OPDSLegacyStreamingContextValue | null>(
	null,
)

export const useOPDSLegacyStreamingContext = () => {
	const context = useContext(OPDSLegacyStreamingContext)
	if (!context) {
		throw new Error(
			'useOPDSLegacyStreamingContext must be used within an OPDSLegacyStreamingContextProvider',
		)
	}
	return context
}

export const getLegacyStreamingContextValue = (
	entry: OPDSLegacyEntry,
	rootURL: string | undefined,
): OPDSLegacyStreamingContextValue | null => {
	const streamingURL = getLegacyPageStreamingURL(entry, rootURL)
	if (!streamingURL) {
		return null
	}

	const pageCountLink = entry.links.find(isPseStreamLink)
	if (!pageCountLink) return null

	const pageCount = pageCountLink['pse:count']
	if (pageCount == null) return null

	return {
		entryId: entry.id,
		entryTitle: entry.title,
		entryContent: entry.content || '',
		streamingURL,
		pageCount,
	}
}
