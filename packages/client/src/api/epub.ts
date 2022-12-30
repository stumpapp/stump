import type { ApiResult, Epub } from '../types'
import { API } from '.'

export function getEpubBaseUrl(id: string): string {
	return `${API.getUri()}/epub/${id}`
}

export function getEpubById(id: string): Promise<ApiResult<Epub>> {
	return API.get(`/epub/${id}`)
}

// This returns raw epub data (e.g. HTML, XHTML, CSS, etc.)
// TODO: type this??
export function getEpubResource(payload: {
	id: string
	root?: string
	resourceId: string
}): Promise<ApiResult<unknown>> {
	return API.get(`/epub/${payload.id}/${payload.root ?? 'META-INF'}/${payload.resourceId}`)
}
