import * as FileSystem from 'expo-file-system/legacy'
import urlJoin from 'url-join'

import { useReaderStore } from '~/stores'
import { BookPreferences } from '~/stores/reader'
import { useSavedServerStore } from '~/stores/savedServer'

// TODO: allow for:
// - Custom organization of files on UI (e.g. folders)
// - Organization derived from server-side metadata (e.g. series, library)
// - Deleting files

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
				acc[serverIDs[i]] = size
				return acc
			},
			{} as Record<string, number>,
		),
		total: appUsageTotal + serverUsageTotal,
	}
}
