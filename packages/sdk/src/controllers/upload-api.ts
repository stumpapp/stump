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

export class UploadAPI extends APIBase {
	async config() {
		const { data } = await this.axios.get<UploadConfig>(uploadURL('/config'))
		return data
	}

	async uploadLibraryBooks(library_id: string, place_at: string, files: File[]) {
		const formData = new FormData()
		formData.append('place_at', place_at)

		files.forEach((file) => {
			formData.append('files', file)
		})

		return this.axios.post(`/upload/libraries/${library_id}/books`, formData)
	}

	async uploadLibrarySeries(library_id: string, series_dir_name: string, files: File[]) {
		const formData = new FormData()
		formData.append('series_dir_name', series_dir_name)

		files.forEach((file) => {
			formData.append('files', file)
		})

		return this.axios.post(`/upload/libraries/${library_id}/series`, formData)
	}

	get keys(): ClassQueryKeys<InstanceType<typeof UploadAPI>> {
		return {
			config: 'upload.config',
			uploadLibraryBooks: 'upload.LibraryBooks',
			uploadLibrarySeries: 'upload.LibrarySeries',
		}
	}
}
