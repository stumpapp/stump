import { Locator, LocatorLocations, LocatorText } from '@readium/shared'
import type { ReadiumLocator, ReadiumLocatorInput } from '@stump/graphql'
import { type EpubSearchResult, resolveUrl } from '@stump/sdk'

import type { ReaderLocator } from '../context'

const RESOURCE_MARKER = '/resource/'

export type ComparableLocator = {
	href: string
	locations?: { position?: number | null; progression?: number | null } | null
}

export type ResolveInitialLocatorArgs = {
	positions: Locator[]
	storedLocator?: ReadiumLocator | null
	percentageCompleted?: number | null
}

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

/**
 * Resolve a locator emitted by Readium's external-link callback back into the
 * publication positions list. Readium sends absolute HTTP(S) links through that
 * callback even when they point at another resource in the same publication.
 */
export function resolvePublicationLinkLocator(
	locator: Locator,
	positions: Locator[],
	currentHref?: string,
): Locator | null {
	const resolvedHref = resolveUrl(locator.href, currentHref)
	const position = positions.find((candidate) => hrefsMatch(candidate.href, resolvedHref))
	if (!position) return null

	return position.copyWithLocations({
		...(locator.locations.fragments.length ? { fragments: [...locator.locations.fragments] } : {}),
		...(locator.locations.progression != null
			? { progression: locator.locations.progression }
			: {}),
	})
}

/** Recombine a Locator's normalized href and first fragment for browser navigation. */
export function locatorToHref(locator: Locator, currentHref?: string): string {
	const href = resolveUrl(locator.href, currentHref)
	const fragment = locator.locations.fragments[0]
	return fragment ? `${href}#${fragment}` : href
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

/** Convert a toolkit locator directly into the reader's serializable locator shape. */
export function toolkitLocatorToReaderLocator(
	locator: Locator,
	chapterTitle?: string,
): ReaderLocator {
	const input = toolkitLocatorToInput(locator, chapterTitle)
	return {
		href: input.href,
		type: input.type || 'application/xhtml+xml',
		title: input.title ?? undefined,
		chapterTitle: input.chapterTitle ?? undefined,
		locations: input.locations
			? {
					fragments: input.locations.fragments,
					progression: input.locations.progression,
					position: input.locations.position,
					totalProgression: input.locations.totalProgression,
					cssSelector: input.locations.cssSelector,
					partialCfi: input.locations.partialCfi,
				}
			: null,
		text: input.text
			? { after: input.text.after, before: input.text.before, highlight: input.text.highlight }
			: null,
	}
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
export function resolveInitialLocator(args: ResolveInitialLocatorArgs): Locator | undefined {
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
export function locatorsRoughlyMatch(a: ComparableLocator, b: ComparableLocator): boolean {
	if (!hrefsMatch(a.href, b.href)) return false

	const aProg = safeNumber(a.locations?.progression)
	const bProg = safeNumber(b.locations?.progression)
	if (aProg != null && bProg != null) {
		// A small per-resource tolerance handles reflow differences without treating
		// unrelated positions in the same chapter as the same bookmark.
		return Math.abs(aProg - bProg) < 0.02
	}
	if (aProg != null || bProg != null) return false

	const aPos = a.locations?.position
	const bPos = b.locations?.position
	if (aPos != null && bPos != null) return aPos === bPos

	return false
}
