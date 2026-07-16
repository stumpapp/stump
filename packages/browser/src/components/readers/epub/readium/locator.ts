import { Locator, LocatorLocations, LocatorText } from '@readium/shared'
import type { ReadiumLocator, ReadiumLocatorInput } from '@stump/graphql'
import type { EpubSearchResult } from '@stump/sdk'

import type { ReaderLocator } from '../context'

const RESOURCE_MARKER = '/resource/'

/**
 * Extract the package-relative path from a resource href (absolute or relative),
 * dropping the fragment. Used to compare mobile/server locators with web positions.
 */
export function packagePathFromHref(href: string): string {
	const withoutFragment = href.split('#')[0] ?? href
	try {
		const url = new URL(withoutFragment, 'https://stump.invalid')
		const idx = url.pathname.indexOf(RESOURCE_MARKER)
		if (idx >= 0) {
			return decodeURIComponent(url.pathname.slice(idx + RESOURCE_MARKER.length))
		}
		return decodeURIComponent(url.pathname.replace(/^\//, ''))
	} catch {
		return withoutFragment.replace(/^\//, '')
	}
}

export function hrefsMatch(a: string, b: string): boolean {
	return packagePathFromHref(a) === packagePathFromHref(b)
}

export function fragmentFromHref(href: string): string | undefined {
	const hash = href.indexOf('#')
	if (hash < 0) return undefined
	const frag = href.slice(hash + 1)
	return frag.length ? frag : undefined
}

function safeNumber(value: unknown): number | undefined {
	if (value == null) return undefined
	const num = Number(value)
	return Number.isFinite(num) ? num : undefined
}

/**
 * Convert a toolkit Locator into GraphQL input for progress/bookmarks.
 */
export function toolkitLocatorToInput(
	locator: Locator,
	chapterTitle?: string,
): ReadiumLocatorInput {
	const locations = locator.locations
	return {
		chapterTitle: chapterTitle ?? locator.title ?? '',
		href: locator.href,
		title: locator.title,
		type: locator.type || 'application/xhtml+xml',
		locations: {
			fragments: locations.fragments?.length ? [...locations.fragments] : undefined,
			position: locations.position,
			progression: safeNumber(locations.progression),
			totalProgression: safeNumber(locations.totalProgression),
			cssSelector:
				typeof locations.otherLocations?.get === 'function'
					? (locations.otherLocations.get('cssSelector') as string | undefined)
					: undefined,
			partialCfi:
				typeof locations.otherLocations?.get === 'function'
					? (locations.otherLocations.get('partialCfi') as string | undefined)
					: undefined,
		},
		text: locator.text
			? {
					after: locator.text.after,
					before: locator.text.before,
					highlight: locator.text.highlight,
				}
			: undefined,
	} satisfies ReadiumLocatorInput
}

/**
 * Build a toolkit Locator from a GraphQL ReadiumLocator (e.g. saved progress).
 */
export function graphQLLocatorToToolkit(locator: ReadiumLocator): Locator {
	const fragments = locator.locations?.fragments ?? undefined
	return new Locator({
		href: locator.href,
		type: locator.type || 'application/xhtml+xml',
		title: locator.title ?? locator.chapterTitle ?? undefined,
		locations: new LocatorLocations({
			fragments: fragments ? [...fragments] : undefined,
			position: locator.locations?.position ?? undefined,
			progression: safeNumber(locator.locations?.progression),
			totalProgression: safeNumber(locator.locations?.totalProgression),
			otherLocations: buildOtherLocations(locator.locations),
		}),
		text: locator.text
			? new LocatorText({
					after: locator.text.after ?? undefined,
					before: locator.text.before ?? undefined,
					highlight: locator.text.highlight ?? undefined,
				})
			: undefined,
	})
}

/**
 * Convert a server EPUB search result's locator into a `ReaderLocator`, ready to pass
 * to `onGoToLocator`. The result's `text` fields are server-computed excerpts around the
 * match and are safe to render literally (no query re-matching needed).
 */
export function searchResultToReaderLocator(result: EpubSearchResult): ReaderLocator {
	const { locator } = result
	return {
		href: locator.href,
		type: locator.type || 'application/xhtml+xml',
		title: locator.title ?? undefined,
		chapterTitle: locator.chapterTitle ?? undefined,
		locations: {
			fragments: locator.locations.fragments ?? undefined,
			progression: locator.locations.progression,
			position: locator.locations.position,
			totalProgression: locator.locations.totalProgression,
		},
		text: {
			after: locator.text.after,
			before: locator.text.before,
			highlight: locator.text.highlight,
		},
	}
}

function buildOtherLocations(
	locations: ReadiumLocator['locations'],
): Map<string, unknown> | undefined {
	if (!locations) return undefined
	const map = new Map<string, unknown>()
	if (locations.cssSelector) map.set('cssSelector', locations.cssSelector)
	if (locations.partialCfi) map.set('partialCfi', locations.partialCfi)
	return map.size ? map : undefined
}

/**
 * Resolve an initial open locator against the server positions list.
 *
 * Priority: matching stored Readium locator (by package path) → nearest
 * totalProgression from saved percentage → undefined (navigator uses positions[0]).
 */
export function resolveInitialLocator(args: {
	positions: Locator[]
	storedLocator?: ReadiumLocator | null
	percentageCompleted?: number | null
}): Locator | undefined {
	const { positions, storedLocator, percentageCompleted } = args
	if (!positions.length) return undefined

	if (storedLocator?.href) {
		const match = positions.find((p) => hrefsMatch(p.href, storedLocator.href))
		if (match) {
			const progression = safeNumber(storedLocator.locations?.progression)
			const fragments = storedLocator.locations?.fragments?.length
				? [...storedLocator.locations.fragments]
				: fragmentFromHref(storedLocator.href)
					? [fragmentFromHref(storedLocator.href)!]
					: undefined

			return match.copyWithLocations({
				progression: progression ?? match.locations.progression,
				fragments: fragments ?? match.locations.fragments,
				totalProgression:
					safeNumber(storedLocator.locations?.totalProgression) ?? match.locations.totalProgression,
			})
		}
	}

	const percentage = safeNumber(percentageCompleted)
	if (percentage != null && percentage > 0) {
		return nearestPositionByTotalProgression(positions, percentage)
	}

	return undefined
}

export function nearestPositionByTotalProgression(positions: Locator[], target: number): Locator {
	const clamped = Math.min(1, Math.max(0, target))
	let best = positions[0]!
	let bestDelta = Number.POSITIVE_INFINITY

	for (const position of positions) {
		const total = safeNumber(position.locations.totalProgression) ?? 0
		const delta = Math.abs(total - clamped)
		if (delta < bestDelta) {
			best = position
			bestDelta = delta
		}
	}

	return best
}

/**
 * Whether two locators refer to approximately the same place for bookmark matching.
 */
export function locatorsRoughlyMatch(
	a: { href: string; locations?: { position?: number | null; progression?: number | null } | null },
	b: { href: string; locations?: { position?: number | null; progression?: number | null } | null },
): boolean {
	if (!hrefsMatch(a.href, b.href)) return false

	const aPos = a.locations?.position
	const bPos = b.locations?.position
	if (aPos != null && bPos != null) {
		return aPos === bPos
	}

	const aProg = safeNumber(a.locations?.progression)
	const bProg = safeNumber(b.locations?.progression)
	if (aProg != null && bProg != null) {
		return Math.abs(aProg - bProg) < 0.02
	}

	return true
}
