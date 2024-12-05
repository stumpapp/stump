import path from 'path'

import { BookSyncPaths } from './config'

type GetRemotePathParams = {
	outputUnix?: boolean
}
/**
 * Normalize a path on the host to the remote based on the configured base paths. This is
 * necessary to properly query the Stump API based on the paths that the watcher will see.
 *
 * # Example
 *
 * ```typescript
 * const host = '/Users/oromei/Documents/Comics'
 * const remote = '/data/comics'
 * const path = '/Users/oromei/Documents/Comics/Marvel/Spider-Man/Issue1.cbz'
 *
 * const remotePath = getRemotePath(path, { host, remote })
 * console.log(remotePath) // '/data/comics/Marvel/Spider-Man/Issue1.cbz'
 * ```
 */
export const getRemotePath = (
	watchedPath: string,
	{ host, remote }: BookSyncPaths,
	{ outputUnix = true }: GetRemotePathParams = {},
): string => {
	const normalizedPath = path.normalize(watchedPath)
	const remotePath = normalizedPath.replace(host, remote)
	return outputUnix ? remotePath.replace(/\\/g, '/') : remotePath.replace(/\//g, '\\')
}
