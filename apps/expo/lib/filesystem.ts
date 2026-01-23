import * as FileSystem from 'expo-file-system/legacy'
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

// FIXME: Need to migrate off of legacy FS methods

export const baseDirectory = `${FileSystem.documentDirectory}`
export const cacheDirectory = `${FileSystem.cacheDirectory}`

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

export async function ensureDirectoryExists(path = baseDirectory) {
	const info = await FileSystem.getInfoAsync(path)
	if (!info.exists) {
		await FileSystem.makeDirectoryAsync(path, { intermediates: true })
	}
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
			const fileInfo = await FileSystem.getInfoAsync(uri)

			if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
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

const getFileSize = async (path: string): Promise<number> => {
	const { exists, isDirectory, ...info } = await FileSystem.getInfoAsync(path)

	const size = 'size' in info ? info.size : 0

	if (!exists) {
		return 0
	} else if (!isDirectory) {
		return size
	}

	const subfiles = await FileSystem.readDirectoryAsync(path)
	const subfileSizes = await Promise.all(
		subfiles.map(async (name) => {
			const subpath = urlJoin(path, name)
			return await getFileSize(subpath)
		}),
	)

	return subfileSizes.reduce((acc, size) => acc + size, 0)
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

export async function getServerFilesUsage(serverID: string) {
	return getFileSize(serverDirectory(serverID))
}

export async function getServerUsage(serverID: string) {
	const fsUsage = await getFileSize(serverDirectory(serverID))
	const prefsUsage = getServerStoredPreferencesUsage(serverID)
	return fsUsage + prefsUsage
}

export async function getAllServersUsage() {
	const serverIDs = useSavedServerStore.getState().servers.map((server) => server.id)
	const usage = await Promise.all(serverIDs.map(getServerUsage))
	return serverIDs.reduce(
		(acc, server, i) => {
			// @ts-expect-error: indexing
			acc[server] = usage[i]
			return acc
		},
		{} as Record<string, number>,
	)
}

export async function getAppUsage() {
	const serverIDs = useSavedServerStore.getState().servers.map((server) => server.id)
	const allRootDirs = (await FileSystem.readDirectoryAsync(baseDirectory))
		.filter((f) => !serverIDs.includes(f))
		.map((f) => `${baseDirectory}/${f}`)

	const serverUsage = await Promise.all(serverIDs.map(getServerUsage))
	const appUsage = await Promise.all(allRootDirs.map(getFileSize))

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
