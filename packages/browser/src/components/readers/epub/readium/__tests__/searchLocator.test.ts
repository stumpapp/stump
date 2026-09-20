import type { EpubSearchResult } from '@stump/sdk'

import { searchResultToReaderLocator } from '../locator'

function buildResult(overrides: Partial<EpubSearchResult> = {}): EpubSearchResult {
	return {
		excerpt: 'before HIGHLIGHT after',
		spineIndex: 2,
		locator: {
			href: '/resource/chapter-3.xhtml#frag',
			type: 'application/xhtml+xml',
			title: 'Chapter Three',
			chapterTitle: 'Chapter Three',
			locations: {
				position: 42,
				progression: 0.5,
				totalProgression: 0.25,
				fragments: ['frag'],
			},
			text: {
				before: 'before ',
				highlight: 'HIGHLIGHT',
				after: ' after',
			},
		},
		...overrides,
	}
}

describe('searchResultToReaderLocator', () => {
	it('maps a full server locator onto a ReaderLocator', () => {
		const locator = searchResultToReaderLocator(buildResult())

		expect(locator).toEqual({
			href: '/resource/chapter-3.xhtml#frag',
			type: 'application/xhtml+xml',
			title: 'Chapter Three',
			chapterTitle: 'Chapter Three',
			locations: {
				fragments: ['frag'],
				progression: 0.5,
				position: 42,
				totalProgression: 0.25,
			},
			text: {
				after: ' after',
				before: 'before ',
				highlight: 'HIGHLIGHT',
			},
		})
	})

	it('falls back to an xhtml mime type and leaves title/chapterTitle undefined when absent', () => {
		const result = buildResult({
			locator: {
				href: '/resource/chapter-1.xhtml',
				type: '',
				locations: { position: 1, progression: 0, totalProgression: 0 },
				text: { before: '', highlight: 'x', after: '' },
			},
		})

		const locator = searchResultToReaderLocator(result)

		expect(locator.type).toBe('application/xhtml+xml')
		expect(locator.title).toBeUndefined()
		expect(locator.chapterTitle).toBeUndefined()
	})

	it('omits fragments when the server does not provide any', () => {
		const result = buildResult()
		result.locator.locations.fragments = null

		const locator = searchResultToReaderLocator(result)

		expect(locator.locations?.fragments).toBeUndefined()
	})
})
