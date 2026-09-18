import { Locator, LocatorLocations } from '@readium/shared'

import { canonicalizeAnnotationHref, enrichSelectionLocator } from '../locator'

describe('canonicalizeAnnotationHref', () => {
	it('canonicalizes an absolute resource href to the matching reading-order entry, keeping its fragment', () => {
		expect(
			canonicalizeAnnotationHref(
				'https://example.com/api/v2/epub/abc/resource/OEBPS/ch1.xhtml#frag',
				['OEBPS/ch1.xhtml'],
			),
		).toBe('OEBPS/ch1.xhtml#frag')
	})

	it('does not duplicate a fragment already present on the matched entry', () => {
		expect(canonicalizeAnnotationHref('OEBPS/ch1.xhtml#frag', ['OEBPS/ch1.xhtml#other'])).toBe(
			'OEBPS/ch1.xhtml#other',
		)
	})

	it('returns the href unchanged when nothing in the reading order matches', () => {
		expect(canonicalizeAnnotationHref('OEBPS/unknown.xhtml', ['OEBPS/ch1.xhtml'])).toBe(
			'OEBPS/unknown.xhtml',
		)
	})
})

describe('enrichSelectionLocator', () => {
	const positions = [
		new Locator({
			href: 'OEBPS/ch1.xhtml',
			type: 'application/xhtml+xml',
			title: 'Chapter One',
			locations: new LocatorLocations({ position: 1, progression: 0, totalProgression: 0.1 }),
		}),
	]

	it('returns null when there is neither a locator href nor selected text', () => {
		expect(
			enrichSelectionLocator({
				selectionLocator: null,
				selectedText: '',
				positions,
				readingOrderHrefs: ['OEBPS/ch1.xhtml'],
			}),
		).toBeNull()
	})

	it('enriches a toolkit Locator selection with the matched position metadata', () => {
		const selectionLocator = new Locator({
			href: 'OEBPS/ch1.xhtml',
			type: 'application/xhtml+xml',
			locations: new LocatorLocations({ progression: 0.42 }),
		})

		const result = enrichSelectionLocator({
			selectionLocator,
			selectedText: 'hello world',
			positions,
			readingOrderHrefs: ['OEBPS/ch1.xhtml'],
		})

		expect(result?.href).toBe('OEBPS/ch1.xhtml')
		expect(result?.chapterTitle).toBe('Chapter One')
		expect(result?.locations?.progression).toBe(0.42)
		expect(result?.locations?.position).toBe(1)
		expect(result?.locations?.totalProgression).toBe(0.1)
		expect(result?.text?.highlight).toBe('hello world')
	})

	it('falls back to the first position href when the selection has no locator', () => {
		const result = enrichSelectionLocator({
			selectionLocator: null,
			selectedText: 'selected text',
			positions,
			readingOrderHrefs: ['OEBPS/ch1.xhtml'],
		})

		expect(result?.href).toBe('OEBPS/ch1.xhtml')
		expect(result?.text?.highlight).toBe('selected text')
	})

	it('prefers the TOC chapter title when the locator has no title of its own', () => {
		const result = enrichSelectionLocator({
			selectionLocator: { href: 'OEBPS/ch1.xhtml', type: 'application/xhtml+xml' },
			selectedText: 'text',
			positions: [],
			readingOrderHrefs: ['OEBPS/ch1.xhtml'],
			chapterTitleFromToc: 'From TOC',
		})

		expect(result?.chapterTitle).toBe('From TOC')
	})
})
