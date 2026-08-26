/**
 * Types for the EPUB REST search API (`GET /api/v2/epub/{id}/search`).
 */

export type EpubSearchLocatorLocations = {
	position: number
	progression: number
	totalProgression: number
	fragments?: string[] | null
}

export type EpubSearchLocatorText = {
	before: string
	highlight: string
	after: string
}

export type EpubSearchLocator = {
	href: string
	type: string
	title?: string | null
	chapterTitle?: string | null
	locations: EpubSearchLocatorLocations
	text: EpubSearchLocatorText
}

export type EpubSearchResult = {
	excerpt: string
	spineIndex: number
	locator: EpubSearchLocator
}

export type EpubSearchResponse = {
	query: string
	results: EpubSearchResult[]
	nextCursor?: string | null
	truncated: boolean
}

export type EpubSearchParams = {
	id: string
	q: string
	limit?: number
	cursor?: string
	signal?: AbortSignal
}
