import type { IEpubPreferences } from '@readium/navigator'
import { ReadingMode, SupportedFont } from '@stump/graphql'

import { toFamilyName } from '../themes'

type ColumnCountPreference = 'auto' | 1 | 2

type PreferenceSource = {
	fontSize?: number
	lineHeight?: number
	fontFamily?: string
	readingMode?: ReadingMode
	isDarkVariant?: boolean
	/**
	 * Desired paginated column count. `'auto'` picks 1 or 2 columns from `stageWidth`.
	 * Has no effect when `readingMode` is continuous scroll.
	 */
	columnCount?: ColumnCountPreference
	/**
	 * Margin (roughly rem) to apply around page content. Readium's `EpubPreferences` has no
	 * dedicated "page margins" concept — the closest analog is `pageGutter`, the space between
	 * columns — so we map it there. Centering the viewport itself is handled by the caller via
	 * CSS `max-width`, not by this mapping.
	 */
	pageMargins?: number
	/**
	 * Current stage (viewport) width in CSS px, used to resolve `'auto'` column count.
	 */
	stageWidth?: number
}

const DEFAULT_PX = 16

/** Below this stage width, `'auto'` resolves to a single column. */
const AUTO_TWO_COLUMN_MIN_WIDTH = 900

/**
 * Resolve an effective Readium `columnCount` from a Stump column preference.
 *
 * - Continuous scroll (`stageWidth` irrelevant) is represented elsewhere by `scroll: true`;
 *   callers of this function should not call it for continuous mode — see
 *   {@link bookPreferencesToEpubPreferences}, which returns `null` directly for that case.
 * - Explicit `1` / `2` are always honored.
 * - `'auto'` picks 2 columns once the stage is wide enough for a comfortable two-page spread,
 *   otherwise 1. When `stageWidth` is not yet known (e.g. first render before layout), `'auto'`
 *   conservatively resolves to 1 column.
 */
export function resolveEffectiveColumnCount(
	columnCount: ColumnCountPreference | undefined,
	stageWidth: number | undefined,
): number | null {
	if (columnCount === 1 || columnCount === 2) {
		return columnCount
	}

	// 'auto' (or unset, which defaults to 'auto')
	if (stageWidth == null) {
		return 1
	}
	return stageWidth < AUTO_TWO_COLUMN_MIN_WIDTH ? 1 : 2
}

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
	columnCount,
	pageMargins,
	stageWidth,
}: PreferenceSource): IEpubPreferences {
	const isContinuous = readingMode === ReadingMode.ContinuousVertical

	const preferences: IEpubPreferences = {
		scroll: isContinuous,
		// Paginated: resolve to an explicit column count so resize does not auto-reflow into
		// arbitrary CSS columns. Continuous scroll does not paginate, so `columnCount` is
		// explicitly cleared to `null` (not `undefined`) — Readium's `EpubPreferences.merging`
		// only overwrites a key when the incoming value is not `undefined`, so `null` is required
		// to actually clear a previously-set explicit column count when switching modes.
		columnCount: isContinuous ? null : resolveEffectiveColumnCount(columnCount, stageWidth),
	}

	if (fontSize != null && fontSize > 0) {
		preferences.fontSize = clamp(fontSize / DEFAULT_PX, 0.7, 4)
	}

	if (lineHeight != null && lineHeight > 0) {
		preferences.lineHeight = clamp(lineHeight, 1, 2.5)
	}

	preferences.fontFamily = fontFamily ? toFamilyName(fontFamily as SupportedFont) : null

	if (!isContinuous && pageMargins != null && pageMargins > 0) {
		preferences.pageGutter = clamp(pageMargins * DEFAULT_PX, 0, DEFAULT_PX * 4)
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
