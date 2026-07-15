import type { IEpubPreferences } from '@readium/navigator'
import { ReadingMode, SupportedFont } from '@stump/graphql'

import { toFamilyName } from '../themes'

type PreferenceSource = {
	fontSize?: number
	lineHeight?: number
	fontFamily?: string
	readingMode?: ReadingMode
	isDarkVariant?: boolean
}

const DEFAULT_PX = 16

/**
 * Map Stump book preferences to Readium EpubPreferences.
 * Stored fontSize is px; Readium expects a scale factor around 1.0.
 */
export function bookPreferencesToEpubPreferences({
	fontSize,
	lineHeight,
	fontFamily,
	readingMode,
	isDarkVariant,
}: PreferenceSource): IEpubPreferences {
	const preferences: IEpubPreferences = {
		scroll: readingMode === ReadingMode.ContinuousVertical,
		// Paginated: lock to one column so resize does not auto-reflow into 2–4 CSS columns.
		// Continuous scroll does not use column pagination.
		columnCount: readingMode === ReadingMode.ContinuousVertical ? undefined : 1,
	}

	if (fontSize != null && fontSize > 0) {
		preferences.fontSize = clamp(fontSize / DEFAULT_PX, 0.7, 4)
	}

	if (lineHeight != null && lineHeight > 0) {
		preferences.lineHeight = clamp(lineHeight, 1, 2.5)
	}

	if (fontFamily) {
		preferences.fontFamily = toFamilyName(fontFamily as SupportedFont)
	}

	if (isDarkVariant) {
		preferences.backgroundColor = '#161719'
		preferences.textColor = '#E8EDF4'
		preferences.linkColor = '#4299E1'
	} else {
		preferences.backgroundColor = '#ffffff'
		preferences.textColor = '#161719'
		preferences.linkColor = '#2563eb'
	}

	return preferences
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

/**
 * Collect origins that must be allowed in the Readium iframe CSP / injectables.
 * Prefer origins found on the RWPM absolute hrefs, and always include the app origin
 * so injected font stylesheets work.
 */
export function collectAllowedDomains(
	hrefs: Array<string | undefined | null>,
	extraOrigins: Array<string | undefined | null> = [],
): string[] {
	const origins = new Set<string>()

	for (const href of hrefs) {
		if (!href) continue
		try {
			origins.add(new URL(href).origin)
		} catch {
			// ignore relative / invalid
		}
	}

	for (const origin of extraOrigins) {
		if (!origin) continue
		try {
			origins.add(new URL(origin).origin)
		} catch {
			origins.add(origin)
		}
	}

	if (typeof window !== 'undefined') {
		origins.add(window.location.origin)
	}

	return [...origins]
}
