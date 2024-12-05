import os from 'os'
import path from 'path'

export const getDefaultConfigDir = (): string => path.join(os.homedir(), '.stump-book-sync')

export const getConfigVar = (key: string, fallback?: string): string => {
	const value = process.env[key]
	if (!value && !fallback) {
		throw new Error(`Environment variable ${key} is not set`)
	}
	return (value || fallback) as string
}

export type BookSyncPaths = {
	/**
	 * The base path on the host, i.e., the prefix of the paths that the watcher will see
	 */
	host: string
	/**
	 * The base path on the remote, i.e., the prefix of the paths that the Stump API will see
	 */
	remote: string
}

export type BookSyncConfig = {
	/**
	 * The URL to the Stump instance
	 */
	baseURL: string
	/**
	 * The API key to use for authentication
	 */
	apiKey: string
	/**
	 * The base paths for the host and the remote, used to normalize paths between the two
	 * file systems in order to properly query the remote based on files watched on the host
	 */
	basePaths: BookSyncPaths
	/**
	 * Whether the remote is a Unix-based system
	 */
	remoteIsUnix: boolean
	/**
	 * The root path to watch for changes
	 */
	watchRoot: string
}

/**
 * Get the configuration for the book sync integration. If any of the required environment variables
 * are not set, this function will throw an error.
 */
export const getConfig = (): BookSyncConfig => ({
	baseURL: getConfigVar('STUMP_URL'),
	apiKey: getConfigVar('STUMP_API_TOKEN'),
	basePaths: {
		host: getConfigVar('STUMP_HOST_BASE_PATH'),
		remote: getConfigVar('STUMP_REMOTE_BASE_PATH'),
	},
	remoteIsUnix: getConfigVar('STUMP_REMOTE_IS_UNIX', 'true') === 'true',
	watchRoot: getConfigVar('STUMP_WATCH_ROOT'),
})
