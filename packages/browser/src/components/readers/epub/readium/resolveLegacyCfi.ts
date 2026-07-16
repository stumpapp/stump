import type { Api } from '@stump/sdk'

import type { ReaderLocator } from '../context'

/**
 * Resolve a legacy full epubcfi via the server (best-effort, read-only).
 */
export async function resolveLegacyCfi(
	sdk: Api,
	bookId: string,
	cfi: string,
	signal?: AbortSignal,
): Promise<ReaderLocator | null> {
	try {
		const resolved = await sdk.epub.resolveCfi({
			id: bookId,
			cfi,
			signal,
		})
		return {
			href: resolved.href,
			type: resolved.type || 'application/xhtml+xml',
			chapterTitle: resolved.chapterTitle,
			locations: {
				partialCfi: resolved.locations.partialCfi,
				position: resolved.locations.position ?? undefined,
				totalProgression: resolved.locations.totalProgression ?? undefined,
			},
		}
	} catch {
		return null
	}
}
