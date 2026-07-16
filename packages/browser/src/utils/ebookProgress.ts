import { EBOOK_EXTENSION } from '@stump/client'

export type ReadProgressLike =
	| {
			epubcfi?: string | null
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
	if (readProgress.epubcfi) return true
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

	const { epubcfi, percentageCompleted, page } = readProgress
	const isEbook = isEbookReadProgress(readProgress, extension)

	if (isEbook && percentageCompleted != null) {
		return Math.round(Number(percentageCompleted) * 100)
	}

	if (epubcfi && percentageCompleted != null) {
		return Math.round(Number(percentageCompleted) * 100)
	}

	if (page && page > 0 && pages > 0) {
		const percent = Math.round((page / pages) * 100)
		return Math.min(Math.max(percent, 0), 100)
	}

	return null
}
