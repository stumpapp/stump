import { EBOOK_EXTENSION, parseGraphQLPercentageDecimal } from '@stump/client'

export type ReadProgressLike =
	| {
			page?: number | null
			percentageCompleted?: number | string | null
			locator?: { href?: string | null } | null
	  }
	| null
	| undefined

export function isEbookExtension(extension: string): boolean {
	return EBOOK_EXTENSION.test(extension)
}

/**
 * Whether read progress should be treated as ebook (percentage) rather than paged.
 */
export function isEbookReadProgress(
	readProgress: ReadProgressLike,
	extension?: string | null,
): boolean {
	if (!readProgress) return false
	if (readProgress.locator?.href) return true
	if (extension && isEbookExtension(extension)) return true
	return false
}

/**
 * Progress percent for library cards and continue-reading surfaces.
 * Prefers ebook percentage when available; falls back to page-based progress.
 */
export function readProgressPercent(
	readProgress: ReadProgressLike,
	pages: number,
	extension?: string | null,
): number | null {
	if (!readProgress) return null

	const { percentageCompleted, page } = readProgress
	const isEbook = isEbookReadProgress(readProgress, extension)

	const percentage = parseGraphQLPercentageDecimal(percentageCompleted)
	if (isEbook && percentage != null) {
		return Math.round(percentage)
	}

	if (page && page > 0 && pages > 0) {
		const percent = Math.round((page / pages) * 100)
		return Math.min(Math.max(percent, 0), 100)
	}

	return null
}
