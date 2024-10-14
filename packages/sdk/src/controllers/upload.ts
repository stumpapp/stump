import { APIBase } from '../base'

export class UploadAPI extends APIBase {
	async uploadLibraryFile(id: string, file: File) {
		const formData = new FormData()
		formData.append('file', file)

		return this.axios.post(`/upload/libraries/${id}`, formData)
	}
}
