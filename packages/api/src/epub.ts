import type {
	Bookmark,
	CreateOrUpdateBookmark,
	DeleteBookmark,
	Epub,
	ReadProgress,
	UpdateEpubProgress,
} from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'

export function getEpubBaseUrl(id: string): string {
	return `${API.getUri()}/epub/${id}`
}

export function getEpubById(id: string): Promise<APIResult<Epub>> {
	return API.get(`/epub/${id}`)
}

export function updateEpubProgress(
	payload: UpdateEpubProgress & { id: string },
): Promise<APIResult<ReadProgress>> {
	return API.put(`/epub/${payload.id}/progress`, payload)
}

// This returns raw epub data (e.g. HTML, XHTML, CSS, etc.)
// TODO: type this??
export function getEpubResource(payload: {
	id: string
	root?: string
	resourceId: string
}): Promise<APIResult<unknown>> {
	return API.get(`/epub/${payload.id}/${payload.root ?? 'META-INF'}/${payload.resourceId}`)
}

export function getBookmarks(id: string): Promise<APIResult<Bookmark[]>> {
	return API.get(`/epub/${id}/bookmarks`)
}

export function createBookmark(
	id: string,
	payload: CreateOrUpdateBookmark,
): Promise<APIResult<Bookmark>> {
	return API.post(`/epub/${id}/bookmarks`, payload)
}

export function deleteBookmark(id: string, payload: DeleteBookmark): Promise<APIResult<Bookmark>> {
	return API.delete(`/epub/${id}/bookmarks`, { data: payload })
}

export const epubApi = {
	createBookmark,
	deleteBookmark,
	getBookmarks,
	getEpubBaseUrl,
	getEpubById,
	getEpubResource,
	updateEpubProgress,
}

export const epubQueryKeys: Record<keyof typeof epubApi, string> = {
	createBookmark: 'epub.createBookmark',
	deleteBookmark: 'epub.deleteBookmark',
	getBookmarks: 'epub.getBookmarks',
	getEpubBaseUrl: 'epub.getEpubBaseUrl',
	getEpubById: 'epub.getEpubById',
	getEpubResource: 'epub.getEpubResource',
	updateEpubProgress: 'epub.updateEpubProgress',
}
