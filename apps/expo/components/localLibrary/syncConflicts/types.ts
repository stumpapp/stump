import { ReadingSessionConflictViewQuery } from '@stump/graphql'

import { downloadedFiles, readProgress } from '~/db'

export type ConflictRecord = {
	downloaded_files: typeof downloadedFiles.$inferSelect
	read_progress: typeof readProgress.$inferSelect
}

type ConflictResolutionView = ReadingSessionConflictViewQuery['readingSessionConflictView']
export type AncestorSession = ConflictResolutionView['ancestorSession']
export type RemoteSession = ConflictResolutionView['remoteSessions'][number]

export type AcceptedRemoteProgressionData = {
	page?: number | null
	elapsedSeconds?: number | null
	percentageCompleted?: string | null
	locator?: unknown
	sessionId?: number | null
	sessionUpdatedAt?: string | null
}
