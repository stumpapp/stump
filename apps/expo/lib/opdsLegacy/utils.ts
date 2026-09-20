import { OPDSLegacyFeed, resolveUrl } from '@stump/sdk'

export const getLegacySearchDocumentURL = (
	feed: OPDSLegacyFeed | null | undefined,
	rootURL: string | undefined,
) => {
	const searchLink = feed?.links.find((link) => link.rel === 'search')?.href
	return searchLink ? resolveUrl(searchLink, rootURL) : undefined
}

export const getLegacySelfLinkURL = (
	feed: OPDSLegacyFeed | null | undefined,
	rootURL: string | undefined,
) => {
	const selfLink = feed?.links.find((link) => link.rel === 'self')?.href
	return selfLink ? resolveUrl(selfLink, rootURL) : undefined
}

export const feedLegacyHasSearch = (feed: OPDSLegacyFeed | null | undefined) =>
	feed?.links.some((link) => link.rel === 'search') ?? false
