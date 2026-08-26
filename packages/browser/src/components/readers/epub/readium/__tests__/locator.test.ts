import { Locator, LocatorLocations } from '@readium/shared'

import {
	hrefsMatch,
	locatorsRoughlyMatch,
	locatorToHref,
	nearestPositionByTotalProgression,
	packagePathFromHref,
	resolveInitialLocator,
	resolvePublicationLinkLocator,
} from '../locator'

describe('packagePathFromHref', () => {
	it('extracts package path from absolute resource URLs', () => {
		expect(
			packagePathFromHref('https://example.com/api/v2/epub/abc/resource/OEBPS/ch%201.xhtml#frag'),
		).toBe('OEBPS/ch 1.xhtml')
	})

	it('handles relative package paths', () => {
		expect(packagePathFromHref('OEBPS/ch1.xhtml#x')).toBe('OEBPS/ch1.xhtml')
	})
})

describe('hrefsMatch', () => {
	it('matches absolute and relative hrefs to the same package path', () => {
		expect(
			hrefsMatch(
				'https://example.com/api/v2/epub/abc/resource/OEBPS/ch1.xhtml',
				'OEBPS/ch1.xhtml#section',
			),
		).toBe(true)
	})
})

describe('resolvePublicationLinkLocator', () => {
	const position = new Locator({
		href: 'http://localhost:10801/api/v2/epub/book/resource/OEBPS/appendix.xhtml',
		type: 'application/xhtml+xml',
		locations: new LocatorLocations({ position: 4, totalProgression: 0.7 }),
	})

	it('recognizes an absolute API URL as an internal publication link', () => {
		const clicked = new Locator({
			href: `${position.href}#sec1-103`,
			type: '',
		})
		const resolved = resolvePublicationLinkLocator(clicked, [position])

		expect(resolved?.href).toBe(position.href)
		expect(resolved?.locations.position).toBe(4)
		expect(resolved?.locations.fragments).toEqual(['sec1-103'])
	})

	it('resolves relative links against the current resource', () => {
		const clicked = new Locator({ href: 'appendix.xhtml#target', type: '' })
		const resolved = resolvePublicationLinkLocator(
			clicked,
			[position],
			'http://localhost:10801/api/v2/epub/book/resource/OEBPS/chapter.xhtml',
		)
		expect(resolved?.locations.fragments).toEqual(['target'])
	})

	it('does not classify an unrelated URL as an internal link', () => {
		const clicked = new Locator({ href: 'https://example.com/page#part', type: '' })
		expect(resolvePublicationLinkLocator(clicked, [position])).toBeNull()
		expect(locatorToHref(clicked)).toBe('https://example.com/page#part')
	})

	it('resolves a relative external destination before opening it', () => {
		const clicked = new Locator({ href: '../../outside.xhtml#part', type: '' })
		expect(locatorToHref(clicked, position.href)).toBe(
			'http://localhost:10801/api/v2/epub/book/outside.xhtml#part',
		)
	})
})

describe('resolveInitialLocator', () => {
	const positions = [
		new Locator({
			href: 'https://example.com/api/v2/epub/abc/resource/a.xhtml',
			type: 'application/xhtml+xml',
			locations: new LocatorLocations({ position: 1, progression: 0, totalProgression: 0 }),
		}),
		new Locator({
			href: 'https://example.com/api/v2/epub/abc/resource/b.xhtml',
			type: 'application/xhtml+xml',
			locations: new LocatorLocations({
				position: 2,
				progression: 0,
				totalProgression: 0.5,
			}),
		}),
		new Locator({
			href: 'https://example.com/api/v2/epub/abc/resource/c.xhtml',
			type: 'application/xhtml+xml',
			locations: new LocatorLocations({
				position: 3,
				progression: 0,
				totalProgression: 0.9,
			}),
		}),
	]

	it('resolves a stored locator by package path and preserves progression', () => {
		const matched = resolveInitialLocator({
			positions,
			storedLocator: {
				chapterTitle: 'B',
				href: 'b.xhtml',
				type: 'application/xhtml+xml',
				locations: {
					fragments: ['sec'],
					progression: 0.4,
					position: 99,
					totalProgression: 0.55,
					cssSelector: '#paragraph-4',
				},
				text: {
					before: 'before',
					highlight: 'highlight',
					after: 'after',
				},
				title: null,
			},
		})

		expect(matched?.href).toContain('b.xhtml')
		expect(matched?.locations.progression).toBe(0.4)
		expect(matched?.locations.position).toBe(2)
		expect(matched?.locations.fragments).toEqual(['sec'])
		expect(matched?.locations.otherLocations?.get('cssSelector')).toBe('#paragraph-4')
		expect(matched?.text?.highlight).toBe('highlight')
	})

	it('falls back to nearest totalProgression from percentage', () => {
		const result = resolveInitialLocator({
			positions,
			percentageCompleted: 0.88,
		})
		expect(result?.href).toContain('c.xhtml')
	})

	it('returns undefined when nothing matches (caller uses positions[0])', () => {
		expect(resolveInitialLocator({ positions: [] })).toBeUndefined()
		expect(resolveInitialLocator({ positions })).toBeUndefined()
	})
})

describe('nearestPositionByTotalProgression', () => {
	it('picks the closest position', () => {
		const positions = [
			new Locator({
				href: 'a',
				type: 'application/xhtml+xml',
				locations: new LocatorLocations({ totalProgression: 0.1 }),
			}),
			new Locator({
				href: 'b',
				type: 'application/xhtml+xml',
				locations: new LocatorLocations({ totalProgression: 0.7 }),
			}),
		]
		expect(nearestPositionByTotalProgression(positions, 0.65).href).toBe('b')
	})
})

describe('locatorsRoughlyMatch', () => {
	it('matches equal positions in the same resource', () => {
		expect(
			locatorsRoughlyMatch(
				{ href: 'OEBPS/chapter.xhtml', locations: { position: 4 } },
				{ href: 'OEBPS/chapter.xhtml', locations: { position: 4 } },
			),
		).toBe(true)
	})

	it('matches nearby progression values in the same resource', () => {
		expect(
			locatorsRoughlyMatch(
				{ href: 'OEBPS/chapter.xhtml', locations: { progression: 0.5 } },
				{ href: 'OEBPS/chapter.xhtml', locations: { progression: 0.51 } },
			),
		).toBe(true)
	})

	it('does not match resource-only locators', () => {
		expect(
			locatorsRoughlyMatch({ href: 'OEBPS/chapter.xhtml' }, { href: 'OEBPS/chapter.xhtml' }),
		).toBe(false)
	})
})
