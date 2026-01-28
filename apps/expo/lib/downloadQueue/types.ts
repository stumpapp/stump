import { z } from 'zod'

import { downloadQueueMetadata, downloadQueueStatus } from '~/db/schema'

export type DownloadQueueStatus = z.infer<typeof downloadQueueStatus>
export type DownloadQueueMetadata = z.infer<typeof downloadQueueMetadata>

export type DownloadProgress = {
	totalBytes: number
	downloadedBytes: number
	percentage: number // 0-100
}

// TODO(opds): It should be possible to intake progressionUrl for OPDS downloads, which would allow
// Stump to attempt pull/push sync for offline books. That would be a really nice enhancement for non-Stump
// users who currently can't use sync offline
export type EnqueueDownloadParams = {
	bookId: string
	serverId: string
	downloadUrl: string
	filename: string
	extension: string
	metadata?: DownloadQueueMetadata | null
}

export type DownloadQueueEventType =
	| 'progress'
	| 'started'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'queue-changed'

export type DownloadQueueEvent =
	| { type: 'progress'; queueId: number; bookId: string; progress: DownloadProgress }
	| { type: 'started'; queueId: number; bookId: string }
	| { type: 'completed'; queueId: number; bookId: string }
	| { type: 'failed'; queueId: number; bookId: string; error: string }
	| { type: 'cancelled'; queueId: number; bookId: string }
	| { type: 'queue-changed' }

export type DownloadQueueEventListener = (event: DownloadQueueEvent) => void
