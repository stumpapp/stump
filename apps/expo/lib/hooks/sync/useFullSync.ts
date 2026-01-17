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
