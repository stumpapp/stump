import { Directory, File, Paths } from 'expo-file-system'
import urlJoin from 'url-join'

import { useReaderStore } from '~/stores'
import { BookPreferences } from '~/stores/reader'
import { useSavedServerStore } from '~/stores/savedServer'

/*
Filesystem structure:

- /document-directory (root)
	- /serverID
		- /books
			- bookID.epub
		- /unpacked
			- /bookID
				- /images
				- /styles
				- etc
*/

export const baseDirectory = Paths.document.uri
export const cacheDirectory = Paths.cache.uri

/**
 * Converts an absolute path to a relative path by stripping the documentDirectory prefix.
 * Note: iOS changes the app container UUID between app updates, so when we store
 * paths in the db we need to store relative paths and construct at runtime
 */
export const toRelativePath = (absolutePath: string): string => {
	if (!absolutePath) return absolutePath

	const path = absolutePath.replace('file://', '')

	const docDir = baseDirectory.replace('file://', '')
	if (path.startsWith(docDir)) {
		return path.slice(docDir.length)
	}

	return path
}

/**
 * Converts a stored relative path back to an absolute path by prepending the current documentDirectory
 */
export const toAbsolutePath = (storedPath: string): string => {
	if (!storedPath) return storedPath

	const path = storedPath.replace('file://', '')

	if (path.startsWith('/')) {
		return path
	}

	const docDir = baseDirectory.replace('file://', '')
	return urlJoin(docDir, path)
}

const serverDirectory = (serverID: string) => urlJoin(baseDirectory, serverID)

export const serverPath = (serverID: string, path: string) =>
	urlJoin(serverDirectory(serverID), path)

export const serverCachePath = (serverID: string, path: string) =>
	urlJoin(cacheDirectory, serverID, path)

export const booksDirectory = (serverID: string) => serverPath(serverID, 'books')

export const thumbnailsDirectory = (serverID: string) => serverPath(serverID, 'thumbnails')

export const bookThumbnailPath = (serverID: string, bookID: string) =>
	urlJoin(thumbnailsDirectory(serverID), `${bookID}.jpg`)

export const unpackedDirectory = (serverID: string) => serverCachePath(serverID, 'unpacked')

export const unpackedBookDirectory = (serverID: string, bookID: string) =>
	urlJoin(unpackedDirectory(serverID), bookID)

export function ensureDirectoryExists(path = baseDirectory) {
	new Directory(path).create({ intermediates: true, idempotent: true })
}

/**
 * Verifies that a downloaded file is fully written and readable.
 * This prevents a race condition on Android where the file system
 * may not have fully flushed the file before Readium tries to access it
 */
export async function verifyFileReadable(
	uri: string,
	maxAttempts: number = 5,
	delayMs: number = 200,
): Promise<void> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const file = new File(uri)

			if (file.exists && file.size > 0) {
				if (attempt === 0) {
					await new Promise((resolve) => setTimeout(resolve, delayMs))
				}
				return
			}

			// File doesn't exist or has zero size, wait and retry
			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs))
			}
		} catch (error) {
			console.warn(`File verification attempt ${attempt + 1} failed:`, error)
			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs))
			}
		}
	}

	throw new Error('Failed to verify file exists', {
		cause: `File not found or inaccessible: ${uri}`,
	})
}

const getFileSize = (path: string): number => {
	const info = Paths.info(path)
	if (!info.exists) return 0

	if (!info.isDirectory) {
		return new File(path).size
	}

	try {
		return new Directory(path).list().reduce((acc, item) => {
			if (item instanceof Directory) {
				return acc + getFileSize(item.uri)
			}
			return acc + (item as File).size
		}, 0)
	} catch {
		return 0
	}
}

export function getServerStoredPreferencesUsage(serverID: string) {
	const storedBookSettings = useReaderStore.getState().bookSettings
	const bookSettingsForServer = Object.entries(storedBookSettings)
		.filter(([, settings]) => settings.serverID === serverID)
		.reduce((acc, [, prefs]) => {
			acc.push(prefs)
			return acc
		}, [] as BookPreferences[])
		.filter(Boolean)

	if (bookSettingsForServer.length === 0) {
		return 0
	}

	const size = new TextEncoder().encode(JSON.stringify(bookSettingsForServer)).length
	return size
}

export function getServerFilesUsage(serverID: string) {
	return getFileSize(serverDirectory(serverID))
}

export function getServerUsage(serverID: string) {
	const fsUsage = getFileSize(serverDirectory(serverID))
	const prefsUsage = getServerStoredPreferencesUsage(serverID)
	return fsUsage + prefsUsage
}

export function getAllServersUsage() {
	const serverIDs = useSavedServerStore.getState().servers.map((server) => server.id)
	const usage = serverIDs.map(getServerUsage)
	return serverIDs.reduce(
		(acc, server, i) => {
			// @ts-expect-error: indexing
			acc[server] = usage[i]
			return acc
		},
		{} as Record<string, number>,
	)
}

export function getAppUsage() {
	const serverIDs = useSavedServerStore.getState().servers.map((server) => server.id)
	const baseDir = new Directory(baseDirectory)
	const allRootDirs = baseDir.exists
		? baseDir
				.list()
				.filter((item) => !serverIDs.includes(item.name))
				.map((item) => item.uri)
		: []

	const serverUsage = serverIDs.map(getServerUsage)
	const appUsage = allRootDirs.map(getFileSize)

	const appUsageTotal = appUsage.reduce((acc, size) => acc + size, 0)
	const serverUsageTotal = serverUsage.reduce((acc, size) => acc + size, 0)

	return {
		appTotal: appUsageTotal,
		serversTotal: serverUsageTotal,
		perServer: serverUsage.reduce(
			(acc, size, i) => {
				// @ts-expect-error: indexing
				acc[serverIDs[i]] = size
				return acc
			},
			{} as Record<string, number>,
		),
		total: appUsageTotal + serverUsageTotal,
	}
}
