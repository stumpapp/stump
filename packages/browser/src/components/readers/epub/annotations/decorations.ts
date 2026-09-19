import { type Decoration, DecorationStyleType } from '@readium/navigator'
import { Locator, LocatorLocations, LocatorText } from '@readium/shared'

import type { ReaderLocator } from '../context'
import { hrefsMatch } from '../readium/locator'
import type { EpubAnnotation } from './types'
import { DEFAULT_HIGHLIGHT_TINT } from './types'

/**
 * Map a persisted annotation into a Readium Decoration for the navigator.
 */
export function annotationToDecoration(
	annotation: EpubAnnotation,
	tint: string = DEFAULT_HIGHLIGHT_TINT,
	positions: Locator[] = [],
): Decoration | null {
	const toolkit = readerLocatorToToolkit(annotation.locator, positions)
	if (!toolkit) return null

	return {
		id: annotation.id,
		locator: toolkit,
		style: {
			type: DecorationStyleType.Highlight,
			tint,
		},
		extras: {
			annotationText: annotation.annotationText ?? null,
			mediaId: annotation.mediaId,
		},
	}
}

export function annotationsToDecorations(
	annotations: EpubAnnotation[],
	tint: string = DEFAULT_HIGHLIGHT_TINT,
	positions: Locator[] = [],
): Decoration[] {
	return annotations
		.map((annotation) => annotationToDecoration(annotation, tint, positions))
		.filter((d): d is Decoration => d != null)
}

export function readerLocatorToToolkit(
	locator: ReaderLocator,
	positions: Locator[] = [],
): Locator | null {
	if (!locator.href) return null

	let href = locator.href
	if (positions.length > 0) {
		const match = positions.find((p) => hrefsMatch(p.href, href))
		if (match) href = match.href
	}

	return new Locator({
		href,
		type: locator.type || 'application/xhtml+xml',
		title: locator.title ?? locator.chapterTitle ?? undefined,
		locations: new LocatorLocations({
			fragments: locator.locations?.fragments ? [...locator.locations.fragments] : undefined,
			position: locator.locations?.position ?? undefined,
			progression: safeNumber(locator.locations?.progression),
			totalProgression: safeNumber(locator.locations?.totalProgression),
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

function safeNumber(value: unknown): number | undefined {
	if (value == null) return undefined
	const num = Number(value)
	return Number.isFinite(num) ? num : undefined
}
