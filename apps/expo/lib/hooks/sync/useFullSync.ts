import { useCallback } from 'react'

import { useAnnotationSync } from './useAnnotationSync'
import { useBookmarkSync } from './useBookmarkSync'
import { useProgressSync } from './useProgressSync'

/**
 * A hook that combines progress, bookmark, and annotation syncing
 */
export function useFullSync() {
	const { syncProgress, pushProgress, pullProgress } = useProgressSync()
	const { syncBookmarks, pushBookmarks, pullBookmarks } = useBookmarkSync()
	const { syncAnnotations, pushAnnotations, pullAnnotations } = useAnnotationSync()

	const syncAll = useCallback(
		async (forServers?: string[]) => {
			const progressResults = await syncProgress(forServers)
			const bookmarkResults = await syncBookmarks(forServers)
			const annotationResults = await syncAnnotations(forServers)

			return {
				progress: progressResults,
				bookmarks: bookmarkResults,
				annotations: annotationResults,
			}
		},
		[syncProgress, syncBookmarks, syncAnnotations],
	)

	const pushAll = useCallback(
		async (forServers?: string[]) => {
			const progressResults = await pushProgress({ forServers })
			const bookmarkResults = await pushBookmarks({ forServers })
			const annotationResults = await pushAnnotations({ forServers })

			return {
				progress: progressResults,
				bookmarks: bookmarkResults,
				annotations: annotationResults,
			}
		},
		[pushProgress, pushBookmarks, pushAnnotations],
	)

	const pullAll = useCallback(
		async (forServers?: string[]) => {
			const progressResults = await pullProgress(forServers)
			const bookmarkResults = await pullBookmarks(forServers)
			const annotationResults = await pullAnnotations(forServers)

			return {
				progress: progressResults,
				bookmarks: bookmarkResults,
				annotations: annotationResults,
			}
		},
		[pullProgress, pullBookmarks, pullAnnotations],
	)

	return {
		syncAll,
		pushAll,
		pullAll,
	}
}

// TODO(reading-journal): sync once we have journal features
// it is a bit tricky, because offline sessions do not map cleanly 1:1 with server sessions.
// the difference primarily lies in the fact that the server will try to chunk reading into
// semantic "reading sessions" (e.g., i sat down for 30 minutes and read). the offline reading,
// however, kinda retains the previous concept where it functions like a cursor but does not
// track granular sessions. perhaps this should change in the future, however it would require
// some level of duplication (e.g., defining your window for a session and logic to determine
// start/end of sessions). im rambling, the point im making here is that once journal features
// are added (assuming they are avail offline) the sync back to server will need a good think
