import type { Locator } from '@readium/shared'

import type { ReaderLocator } from '../context'
import { hrefsMatch, packagePathFromHref } from '../readium/locator'

/**
 * Canonicalize a locator href against the publication reading-order hrefs so
 * stored annotations always use the same absolute resource URLs as positions.
 */
export function canonicalizeAnnotationHref(href: string, readingOrderHrefs: string[]): string {
	const match = readingOrderHrefs.find((candidate) => hrefsMatch(candidate, href))
	if (!match) return href

	const fragment = href.includes('#') ? href.slice(href.indexOf('#')) : ''
	const matchHasFragment = match.includes('#')
	if (fragment && !matchHasFragment) return `${match}${fragment}`
	return match
}

/**
 * Enrich a selection locator with TOC chapter title and nearest position metadata
 * before persistence. Prefer selection text / progression when present.
 */
export function enrichSelectionLocator(args: {
	selectionLocator: Locator | ReaderLocator | null | undefined
	selectedText: string
	positions: Locator[]
	readingOrderHrefs: string[]
	chapterTitleFromToc?: string
}): ReaderLocator | null {
	const { selectionLocator, selectedText, positions, readingOrderHrefs, chapterTitleFromToc } = args
	if (!selectionLocator?.href && !selectedText) return null

	const rawHref = selectionLocator?.href ?? positions[0]?.href
	if (!rawHref) return null

	const href = canonicalizeAnnotationHref(rawHref, readingOrderHrefs)
	const match = positions.find((p) => hrefsMatch(p.href, href))

	const progression =
		safeNumber(
			selectionLocator && 'locations' in selectionLocator && selectionLocator.locations
				? 'progression' in selectionLocator.locations
					? selectionLocator.locations.progression
					: undefined
				: undefined,
		) ??
		safeNumber(match?.locations.progression) ??
		0

	const position =
		safeNumber(
			selectionLocator && 'locations' in selectionLocator && selectionLocator.locations
				? 'position' in selectionLocator.locations
					? (selectionLocator.locations as { position?: number | null }).position
					: undefined
				: undefined,
		) ?? safeNumber(match?.locations.position)

	const totalProgression =
		safeNumber(
			selectionLocator && 'locations' in selectionLocator && selectionLocator.locations
				? 'totalProgression' in selectionLocator.locations
					? (selectionLocator.locations as { totalProgression?: number | null }).totalProgression
					: undefined
				: undefined,
		) ?? safeNumber(match?.locations.totalProgression)

	const title =
		(selectionLocator && 'title' in selectionLocator && selectionLocator.title) ||
		match?.title ||
		chapterTitleFromToc ||
		undefined

	const chapterTitle =
		(selectionLocator && 'chapterTitle' in selectionLocator && selectionLocator.chapterTitle) ||
		chapterTitleFromToc ||
		title ||
		packagePathFromHref(href)

	const highlight =
		selectedText ||
		(selectionLocator && 'text' in selectionLocator
			? selectionLocator.text?.highlight
			: undefined) ||
		undefined

	return {
		href,
		type:
			(selectionLocator && 'type' in selectionLocator && selectionLocator.type) ||
			match?.type ||
			'application/xhtml+xml',
		title: title ?? undefined,
		chapterTitle: chapterTitle ?? undefined,
		locations: {
			fragments:
				selectionLocator &&
				'locations' in selectionLocator &&
				selectionLocator.locations &&
				'fragments' in selectionLocator.locations
					? ((selectionLocator.locations as { fragments?: string[] | null }).fragments ?? undefined)
					: undefined,
			progression,
			position: position ?? undefined,
			totalProgression: totalProgression ?? undefined,
		},
		text: highlight
			? {
					highlight,
					before:
						selectionLocator && 'text' in selectionLocator
							? selectionLocator.text?.before
							: undefined,
					after:
						selectionLocator && 'text' in selectionLocator
							? selectionLocator.text?.after
							: undefined,
				}
			: undefined,
	}
}

const TEXT_CONTEXT_LENGTH = 32

/**
 * Readium's web navigator does not populate `text.before` / `text.after` on the
 * `Locator` returned by the `textSelected` event — only `text.highlight` is set.
 * Without surrounding context, Readium's `TextQuoteAnchor.matchQuote()` cannot
 * disambiguate repeated text and always anchors to the first occurrence in the
 * chapter.
 *
 * Extract the context directly from the iframe's DOM selection to fix this.
 * Must be called immediately on the `textSelected` event, before anything else
 * can modify the selection.
 *
 * Mobile (native Readium) already provides full text context via `LocatorText`.
 */
export function extractSelectionContext(
	container: HTMLDivElement,
	targetFrameSrc?: string,
): { before?: string; after?: string } | null {
	try {
		const iframes = container.querySelectorAll('iframe')
		for (const iframe of iframes) {
			if (!iframe.contentDocument) continue
			if (
				targetFrameSrc &&
				iframe.src !== targetFrameSrc &&
				iframe.contentWindow?.location.href !== targetFrameSrc
			) {
				continue
			}

			const sel = iframe.contentDocument.getSelection()
			if (!sel || sel.rangeCount === 0 || sel.toString().length === 0) continue

			const range = sel.getRangeAt(0)
			const root = iframe.contentDocument.body
			if (!root) continue

			const preRange = iframe.contentDocument.createRange()
			preRange.setStart(root, 0)
			preRange.setEnd(range.startContainer, range.startOffset)
			const start = preRange.toString().length
			const end = start + range.toString().length
			const fullText = root.textContent || ''

			const before =
				start > 0 ? fullText.slice(Math.max(0, start - TEXT_CONTEXT_LENGTH), start) : undefined
			const after =
				end < fullText.length
					? fullText.slice(end, Math.min(fullText.length, end + TEXT_CONTEXT_LENGTH))
					: undefined

			return { before, after }
		}
	} catch {
		// Cross-origin or destroyed iframe — ignore gracefully.
	}
	return null
}

function safeNumber(value: unknown): number | undefined {
	if (value == null) return undefined
	const num = Number(value)
	return Number.isFinite(num) ? num : undefined
}
