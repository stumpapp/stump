export type ClaimResponse = {
	isClaimed: boolean
}

export type UploadLibraryBooks = {
	library_id: string
	files: File[]
}

export type UploadLibrarySeries = {
	library_id: string
	series_dir_name: string
	file: File
}

export type UploaderParams<T extends object> = T & {
	place_at: string

	/**
	 * An optional callback to be called when the upload progress changes
	 * @param progress The progress of the upload as a percentage (0-100)
	 */
	onProgress?: (progress: number) => void
}
