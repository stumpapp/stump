import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSDK } from '@stump/client'
import { MediaMetadata } from '@stump/graphql'
import * as FileSystem from 'expo-file-system/legacy'
import { useCallback, useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useActiveServer } from '~/components/activeServer'
import { booksDirectory, ensureDirectoryExists } from '~/lib/filesystem'

// TODO(offline-reading): Migrate to SQLite, this won't scale well I think

// Empty object yada yada
// eslint-disable-next-line
type UnsyncedReadProgress = {}

type FileStumpRef = {
	book: {
		id: string
		name: string
		metadata?: Partial<MediaMetadata>
	}
	seriesID: string
}

// TODO: figure out id situation...
type DownloadedFile = {
	id: string
	filename: string // bookID.epub
	serverID: string
	unsyncedProgress?: UnsyncedReadProgress
	stumpRef?: FileStumpRef
	size?: number // in bytes
}

type SeriesRef = {
	id: string
	name: string
}
type StumpSeriesRefMap = Record<string, SeriesRef>

type LibraryRef = {
	id: string
	name: string
}
type StumpLibraryRefMap = Record<string, LibraryRef>

// A reference to a book that is currently being read. This will be used for widgets
// type ActivelyReadingRef = {}

type AddFileMeta = {
	seriesRef?: SeriesRef
	libraryRef?: LibraryRef
}

type DownloadStore = {
	/**
	 * The list of references to downloaded files
	 */
	files: DownloadedFile[]
	/**
	 * A function to add a file to the list of downloaded files
	 */
	addFile: (file: DownloadedFile, meta?: AddFileMeta) => void
	/**
	 * A map of references to Stump series, used for offline displaying of series-related
	 * information
	 */
	seriesRefs: StumpSeriesRefMap
	/**
	 * A map of references to Stump libraries, used for offline displaying of library-related
	 * information
	 */
	libraryRefs: StumpLibraryRefMap
}

export const useDownloadStore = create<DownloadStore>()(
	persist(
		(set, get) => ({
			files: [] as DownloadedFile[],
			addFile: (file, meta) => {
				// Add the file to the list of downloaded files
				set({ files: [...get().files, file] })

				if (meta?.seriesRef) {
					// Add the series reference to the list of series references
					set({
						seriesRefs: {
							...get().seriesRefs,
							[meta.seriesRef.id]: meta.seriesRef,
						},
					})
				}

				if (meta?.libraryRef) {
					// Add the library reference to the list of library references
					set({
						libraryRefs: {
							...get().libraryRefs,
							[meta.libraryRef.id]: meta.libraryRef,
						},
					})
				}
			},

			seriesRefs: {} as StumpSeriesRefMap,
			libraryRefs: {} as StumpLibraryRefMap,
		}),
		{
			name: 'stump-mobile-downloads-store',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)

type DownloadParams = {
	id: string
	url?: string
	extension: string
	name: string
}

export function useDownload() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { files, addFile } = useDownloadStore()

	useEffect(() => {
		ensureDirectoryExists(booksDirectory(serverID))
	}, [serverID])

	const downloadBook = useCallback(
		async ({ id, url, extension }: DownloadParams) => {
			await ensureDirectoryExists(booksDirectory(serverID))
			const existingBook = files.find((f) => f.id === id && f.serverID === serverID)
			if (existingBook) {
				return `${booksDirectory(serverID)}/${existingBook.filename}`
			}

			const downloadUrl = url || sdk.media.downloadURL(id)
			const filename = `${id}.${extension}`
			const placementUrl = `${booksDirectory(serverID)}/${filename}`

			// console.log('Downloading book to:', placementUrl)

			try {
				const result = await FileSystem.downloadAsync(downloadUrl, placementUrl, {
					headers: sdk.headers,
				})

				if (result.status !== 200) {
					console.error('Failed to download file, status code:', result.status)
					return null
				}

				const size = Number(result.headers['Content-Length'] ?? 0)

				addFile({
					id,
					filename,
					serverID,
					size: !isNaN(size) && size > 0 ? size : undefined,
				})

				return result.uri
			} catch (e) {
				console.error('Error downloading book', e)
				return null
			}
		},
		[addFile, files, sdk, serverID],
	)

	const deleteBook = useCallback(
		async (bookID: string) => {
			const file = files.find((f) => f.id === bookID && f.serverID === serverID)
			if (!file) {
				console.warn('File not found in download store')
				return
			}

			const fileUri = `${booksDirectory(serverID)}/${file.filename}`
			try {
				const info = await FileSystem.getInfoAsync(fileUri)
				if (info.exists) {
					await FileSystem.deleteAsync(fileUri)
				}
			} catch (e) {
				console.error('Error deleting file:', e)
			}

			// Remove the file from the store
			useDownloadStore.setState({
				files: useDownloadStore
					.getState()
					.files.filter((f) => !(f.id === bookID && f.serverID === serverID)),
			})
		},
		[files, serverID],
	)

	const isBookDownloaded = useCallback(
		(bookID: string) => files.some((file) => file.id === bookID && file.serverID === serverID),
		[files, serverID],
	)

	return { downloadBook, deleteBook, isBookDownloaded }
}

type UseServerDownloadsParams = {
	id: string
}
export const useServerDownloads = ({ id }: UseServerDownloadsParams) => {
	const { files } = useDownloadStore((store) => ({ files: store.files }))
	return files.filter((file) => file.serverID === id)
}

export const useIsBookDownloaded = (bookID: string) => {
	const { activeServer } = useActiveServer()
	const { files } = useDownloadStore((store) => ({ files: store.files }))
	return useMemo(
		() => files.some((file) => file.id === bookID && file.serverID === activeServer.id),
		[files, bookID, activeServer.id],
	)
}
