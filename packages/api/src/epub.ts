import type { Epub } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

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

export const epubApi = {
	getEpubBaseUrl,
	getEpubById,
	getEpubResource,
}

export const epubQueryKeys: Record<keyof typeof epubApi, string> = {
	getEpubBaseUrl: 'epub.getEpubBaseUrl',
	getEpubById: 'epub.getEpubById',
	getEpubResource: 'epub.getEpubResource',
}
