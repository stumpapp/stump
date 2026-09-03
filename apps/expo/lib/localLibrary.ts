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
