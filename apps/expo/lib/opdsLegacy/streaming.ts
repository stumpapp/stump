import { isPseStreamLink, resolveUrl } from '@stump/sdk'
import { OPDSLegacyEntry } from '@stump/sdk'

export const getLegacyPageStreamingURL = (entry: OPDSLegacyEntry, rootURL: string | undefined) => {
	const streamingLink = entry.links.find(isPseStreamLink)?.href
	return streamingLink ? resolveUrl(streamingLink, rootURL) : undefined
}

export type OPDSLegacyStreamingData = {
	entryId: string
	entryTitle: string
	entryContent: string
	streamingURL: string
	pageCount: number
	/**
	 * the last-read page reported by the server via pse:lastRead (1-indexed)
	 */
	serverLastRead?: number
}

export const getLegacyStreamingData = (
	entry: OPDSLegacyEntry,
	rootURL: string | undefined,
): OPDSLegacyStreamingData | null => {
	const streamingURL = getLegacyPageStreamingURL(entry, rootURL)
	if (!streamingURL) {
		return null
	}

	const pageCountLink = entry.links.find(isPseStreamLink)
	if (!pageCountLink) return null

	const pageCount = pageCountLink['pse:count']
	if (pageCount == null) return null

	const serverLastRead = pageCountLink['pse:lastRead'] ?? undefined

	return {
		entryId: entry.id,
		entryTitle: entry.title,
		entryContent: entry.content || '',
		streamingURL,
		pageCount,
		serverLastRead,
	}
}
