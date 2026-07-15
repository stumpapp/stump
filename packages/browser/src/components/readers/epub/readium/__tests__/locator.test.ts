import { Locator, LocatorLocations } from '@readium/shared'

import {
	hrefsMatch,
	nearestPositionByTotalProgression,
	packagePathFromHref,
	resolveInitialLocator,
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
					cssSelector: null,
					partialCfi: null,
				},
				text: null,
				title: null,
			},
		})

		expect(matched?.href).toContain('b.xhtml')
		expect(matched?.locations.progression).toBe(0.4)
		expect(matched?.locations.position).toBe(2)
		expect(matched?.locations.fragments).toEqual(['sec'])
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
