import { APIBase } from '../base'
import { UploadConfig } from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the tag API
 */
const UPLOAD_ROUTE = '/upload'
/**
 * A helper function to format the URL for tags API routes with optional query parameters
 */
const uploadURL = createRouteURLHandler(UPLOAD_ROUTE)

// TODO(upload): have server generate these types when API is stable
export type UploadLibraryBooks = {
	library_id: string
	place_at: string
}

export type UploadLibrarySeries = {
	library_id: string
	series_dir_name: string
}

export type UploaderParams<T extends object> = T & {
	files: File[]
	/**
	 * An optional callback to be called when the upload progress changes
	 * @param progress The progress of the upload as a percentage (0-100)
	 */
	onProgress?: (progress: number) => void
}

export class UploadAPI extends APIBase {
	async config() {
		const { data } = await this.axios.get<UploadConfig>('/config/upload')
		return data
	}

	async uploadLibraryBooks({
		library_id,
		place_at,
		files,
		onProgress,
	}: UploaderParams<UploadLibraryBooks>) {
		const formData = new FormData()
		formData.append('place_at', place_at)

		const estimatedSize = files.reduce((acc, file) => acc + file.size, 0)
		files.forEach((file) => {
			formData.append('files', file)
		})

		return this.axios.post(uploadURL(`/libraries/${library_id}/books`), formData, {
			onUploadProgress: ({ loaded, total }) => {
				const progress = Math.round((loaded * 100) / (total || estimatedSize))
				onProgress?.(progress)
				console.log('progress event!', { loaded, progress, total })
			},
		})
	}

	async uploadLibrarySeries({
		library_id,
		series_dir_name,
		files,
		onProgress,
	}: UploaderParams<UploadLibrarySeries>) {
		const formData = new FormData()
		formData.append('series_dir_name', series_dir_name)

		const estimatedSize = files.reduce((acc, file) => acc + file.size, 0)
		files.forEach((file) => {
			formData.append('files', file)
		})

		return this.axios.post(`/upload/libraries/${library_id}/series`, formData, {
			onUploadProgress: ({ loaded, total }) => {
				const progress = Math.round((loaded * 100) / (total || estimatedSize))
				onProgress?.(progress)
			},
		})
	}

	get keys(): ClassQueryKeys<InstanceType<typeof UploadAPI>> {
		return {
			config: 'upload.config',
			uploadLibraryBooks: 'upload.LibraryBooks',
			uploadLibrarySeries: 'upload.LibrarySeries',
		}
	}
}
