import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSDK } from '@stump/client'
import { Library, Media, Series } from '@stump/sdk'
import { AxiosInstance } from 'axios'
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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

const baseDirectory = `${FileSystem.documentDirectory}`

const serverDirectory = (serverID: string, path: string) => {
	return `${baseDirectory}${serverID}/${path}`
}

const booksDirectory = (serverID: string) => {
	return serverDirectory(serverID, 'books')
}

export async function ensureDirectoryExists(path = baseDirectory) {
	const info = await FileSystem.getInfoAsync(path)
	if (!info.exists) {
		console.log('Creating directory', path)
		await FileSystem.makeDirectoryAsync(path)
		console.log('Directory created', path)
	}
}

type UnsyncedReadProgress = {}

type FileStumpRef = {
	book: Pick<Media, 'id' | 'name' | 'metadata'>
	seriesID: string
}

// TODO: figure out id situation...
type DownloadedFile = {
	id: string
	filename: string // bookID.epub
	serverID: string
	unsyncedProgress?: UnsyncedReadProgress
	stumpRef?: FileStumpRef
}

type SeriesRef = Pick<Series, 'id' | 'name' | 'media'>
type StumpSeriesRefMap = Record<string, SeriesRef>

type LibraryRef = Pick<Library, 'id' | 'name'>
type StumpLibraryRefMap = Record<string, LibraryRef>

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
	url: string
	expectedMime?: string
	meta?: AddFileMeta
}

export function useDownload() {
	const { files, addFile } = useDownloadStore()
	const { sdk } = useSDK()

	useEffect(() => {
		ensureDirectoryExists()
	}, [])

	const downloadBook = useCallback(
		async (file: Omit<DownloadedFile, 'filename'>, { url, meta, expectedMime }: DownloadParams) => {
			// TODO: Won't have id for all books
			if (files.some((f) => f.id === file.id)) {
				console.log('File already downloaded')
				return
			}

			const filename = `${file.id}${extFromMime(expectedMime || '')}`
			const fileUri = `${booksDirectory(file.serverID)}/${filename}`
			console.log('Downloading book', { file, url, fileUri })
			try {
				const result = await FileSystem.downloadAsync(url, fileUri, {
					headers: sdk.headers,
				})
				console.log('Download result', result)

				if (result.status !== 200) {
					return
				}

				addFile(
					{
						...file,
						filename,
					},
					meta,
				)
			} catch (e) {
				console.error('Error downloading book', e)
			}
		},
		[addFile],
	)

	return { downloadBook }
}

const extFromMime = (mime: string) => {
	switch (mime) {
		case 'application/epub+zip':
			return '.epub'
		default:
			return ''
	}
}
