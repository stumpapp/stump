import { MediaProgressInput } from '@stump/graphql'
import { randomUUID } from 'expo-crypto'

import { epubProgress, readProgress } from '~/db'

/**
 * A constant representing the "local library" which will just contain
 * imported files that are not associated with any server. This felt way
 * easier than wrangling with optional server IDs everywhere.
 */
export const LOCAL_LIBRARY_SERVER_ID = '00000000-0000-0000-0000-000000000000'

export const isLocalLibrary = (serverId: string): boolean => serverId === LOCAL_LIBRARY_SERVER_ID

export const generateLocalBookId = (): string => randomUUID()

export const IMPORTABLE_EXTENSIONS = ['epub', 'cbz', 'pdf'] as const
export type ImportableExtension = (typeof IMPORTABLE_EXTENSIONS)[number]

export const isImportableFile = (filename: string): boolean => {
	const ext = filename.split('.').pop()?.toLowerCase()
	return ext ? IMPORTABLE_EXTENSIONS.includes(ext as ImportableExtension) : false
}

export const getFileExtension = (filename: string): string | undefined => {
	return filename.split('.').pop()?.toLowerCase()
}

/**
 * Maps the MIME types declared in the Android manifest's ACTION_VIEW intent-filters
 * to the app's supported import extensions. `application/x-cbz` and
 * `application/vnd.comicbook+zip` both mean `.cbz`.
 */
const MIME_TYPE_TO_EXTENSION: Record<string, ImportableExtension> = {
	'application/epub+zip': 'epub',
	'application/pdf': 'pdf',
	'application/x-cbz': 'cbz',
	'application/vnd.comicbook+zip': 'cbz',
}

/**
 * Resolves an importable extension from a MIME type such as the one returned by
 * expo-file-system's `File.type` (backed by Android's `ContentResolver#getType`,
 * which works for `content://` URIs, unlike filename-based extension guessing).
 * Returns undefined for missing, generic, or unmapped types (e.g.
 * `application/octet-stream`, `application/zip`) rather than guessing.
 */
export const getExtensionFromMimeType = (
	mimeType: string | null | undefined,
): ImportableExtension | undefined => {
	const normalized = mimeType?.split(';')[0]?.trim().toLowerCase()
	return normalized ? MIME_TYPE_TO_EXTENSION[normalized] : undefined
}

/**
 * Resolves the extension to use for an imported file. MIME type is authoritative
 * when it maps to a supported format, since it's resolved correctly even for
 * opaque `content://` URIs; filename-derived extension is only a fallback.
 */
export const resolveImportableExtension = (
	mimeType: string | null | undefined,
	filename: string,
): ImportableExtension | undefined => {
	const fromMimeType = getExtensionFromMimeType(mimeType)
	if (fromMimeType) {
		return fromMimeType
	}

	const ext = getFileExtension(filename)
	return ext && IMPORTABLE_EXTENSIONS.includes(ext as ImportableExtension)
		? (ext as ImportableExtension)
		: undefined
}

export function buildLocalToRemoteProgressInput(
	local: typeof readProgress.$inferSelect,
): MediaProgressInput {
	const epubData = epubProgress.safeParse(local.epubProgress).data
	const elapsedDelta = local.pendingReset
		? (local.elapsedSeconds ?? 0)
		: Math.max(0, (local.elapsedSeconds ?? 0) - (local.lastSyncedElapsedSeconds ?? 0))

	if (epubData) {
		return {
			epub: {
				locator: epubData,
				elapsedSecondsDelta: elapsedDelta > 0 ? elapsedDelta : undefined,
				isComplete: local.percentage ? parseFloat(local.percentage) >= 1.0 : false,
				percentage: local.percentage,
				resetElapsedSeconds: local.pendingReset ?? undefined,
			},
		}
	}

	return {
		paged: {
			page: local.page ?? 1,
			elapsedSecondsDelta: elapsedDelta > 0 ? elapsedDelta : undefined,
			resetElapsedSeconds: local.pendingReset ?? undefined,
		},
	}
}
