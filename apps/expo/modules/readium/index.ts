import { ReadiumLocator as StumpReadiumLocator } from '@stump/graphql'
import omit from 'lodash/omit'

import { BookmarkRef } from '~/components/book/reader/image/context'

import { PDFLocator, ReadiumLink, ReadiumLocator } from './src'
import ReadiumModule from './src/ReadiumModule'

export { BookLoadedEvent as PDFBookLoadedEvent, PDFView, PDFViewRef } from './src/PDFView'
export * from './src/Readium.types'
export { default } from './src/ReadiumModule'
export { default as ReadiumView } from './src/ReadiumView'

type GraphQLBookmark = {
	id: string
	epubcfi?: string | null
	mediaId: string
	previewContent?: string | null
	locator?: {
		chapterTitle?: string | null
		href: string
		locations?: {
			fragments?: string[] | null
			position?: number | null
			progression?: string | number | null
			totalProgression?: string | number | null
			cssSelector?: string | null
			partialCfi?: string | null
		} | null
	} | null
}

const safeNumber = (value: unknown): number | null => {
	if (value == null) return null
	const num = Number(value)
	return Number.isNaN(num) ? null : num
}

export function intoBookmarkRef(bookmark: GraphQLBookmark): BookmarkRef {
	return {
		id: bookmark.id,
		epubcfi: bookmark.epubcfi,
		href: bookmark.locator?.href ?? '',
		chapterTitle: bookmark.locator?.chapterTitle ?? '',
		locations: bookmark.locator?.locations
			? {
					fragments: bookmark.locator.locations.fragments,
					position: bookmark.locator.locations.position,
					progression: safeNumber(bookmark.locator.locations.progression),
					totalProgression: safeNumber(bookmark.locator.locations.totalProgression),
					cssSelector: bookmark.locator.locations.cssSelector,
					partialCfi: bookmark.locator.locations.partialCfi,
				}
			: null,
		previewContent: bookmark.previewContent,
		mediaId: bookmark.mediaId,
	}
}

export async function locateLink(
	bookId: string,
	link: ReadiumLink,
): Promise<ReadiumLocator | null> {
	const locator = await ReadiumModule.locateLink(bookId, link)
	return locator
}

export async function extractArchive(url: string, destination: string): Promise<void> {
	return ReadiumModule.extractArchive(url, destination)
}

export async function openPublication(bookId: string, url: string): Promise<void> {
	return ReadiumModule.openPublication(bookId, url)
}

export async function getResource(bookId: string, href: string): Promise<string> {
	return ReadiumModule.getResource(bookId, href)
}

export async function getPositions(bookId: string): Promise<ReadiumLocator[]> {
	return ReadiumModule.getPositions(bookId)
}

export async function goToLocation(bookId: string, locator: ReadiumLocator): Promise<void> {
	return ReadiumModule.goToLocation(bookId, locator)
}

export function intoReadiumLocator(locator: StumpReadiumLocator): ReadiumLocator {
	const safeNumber = (value: unknown) => {
		if (value == null) return null
		const num = Number(value)
		return Number.isNaN(num) ? undefined : num
	}

	return {
		...omit(locator, ['__typename', 'locations', 'type']),
		locations: {
			position: safeNumber(locator.locations?.position),
			progression: safeNumber(locator.locations?.progression),
			totalProgression: safeNumber(locator.locations?.totalProgression),
		},
		type: locator.type || 'application/xhtml+xml',
	}
}

export function intoPDFReadiumLocator(page: number): PDFLocator {
	return {
		locations: {
			position: page,
			fragments: [`page=${page}`],
		},
		href: 'publication.pdf',
		type: 'application/pdf',
	}
}
