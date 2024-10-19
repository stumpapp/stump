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

	async uploadLibraryFile(id: string, file: File) {
		const formData = new FormData()
		formData.append('file', file)

		return this.axios.post(`/upload/libraries/${id}`, formData)
	}

	get keys(): ClassQueryKeys<InstanceType<typeof UploadAPI>> {
		return {
			config: 'upload.config',
			uploadLibraryFile: 'upload.libraryFile',
		}
	}
}
