import type {
	Media,
	MediaIsComplete,
	PatchMediaThumbnail,
	ProgressUpdateReturn,
	PutMediaCompletionStatus,
} from '@stump/types'

import { API } from './axios'
import { APIResult, CursorQueryParams, PageableAPIResult } from './types'
import { mergeCursorParams, toUrlParams, urlWithParams } from './utils'

type GetMediaById = APIResult<Media>

export function getMedia(filters?: Record<string, unknown>): Promise<PageableAPIResult<Media[]>> {
	const params = toUrlParams(filters)
	return API.get(urlWithParams('/media', params))
}

export function getMediaWithCursor({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableAPIResult<Media[]>> {
	const searchParams = mergeCursorParams({ afterId, limit, params })
	return API.get(urlWithParams('/media', searchParams))
}

export function getPaginatedMedia(page: number): Promise<PageableAPIResult<Media[]>> {
	return API.get(`/media?page=${page}`)
}

export function getMediaById(id: string, params?: Record<string, unknown>): Promise<GetMediaById> {
	if (params) {
		return API.get(`/media/${id}?${toUrlParams(params)}`)
	} else {
		return API.get(`/media/${id}?load_series=true`)
	}
}

export function getMediaByPath(path: string): Promise<APIResult<Media>> {
	return API.get(`/media/path/${encodeURIComponent(path)}`)
}

export function getRecentlyAddedMedia({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableAPIResult<Media[]>> {
	const searchParams = mergeCursorParams({ afterId, limit, params })
	return API.get(urlWithParams('/media/recently-added', searchParams))
}

export function getInProgressMedia({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableAPIResult<Media[]>> {
	const searchParams = mergeCursorParams({ afterId, limit, params })
	return API.get(urlWithParams('/media/keep-reading', searchParams))
}

export function getMediaThumbnail(id: string): string {
	return `${API.getUri()}/media/${id}/thumbnail`
}

export function getMediaDownloadUrl(id: string): string {
	return `${API.getUri()}/media/${id}/file`
}

// TODO: misleading, sounds like paged API response but is actualy a page image
export function getMediaPage(id: string, page: number): string {
	return `${API.getUri()}/media/${id}/page/${page}`
}

export function updateMediaProgress(
	id: string,
	page: number,
): Promise<APIResult<ProgressUpdateReturn>> {
	return API.put(`/media/${id}/progress/${page}`)
}

export function patchMediaThumbnail(id: string, params: PatchMediaThumbnail) {
	return API.patch(`/media/${id}/thumbnail`, params)
}

export function uploadMediaThumbnail(id: string, file: File) {
	const formData = new FormData()
	formData.append('file', file)
	return API.post(`/media/${id}/thumbnail`, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})
}

export function putMediaCompletion(
	id: string,
	payload: PutMediaCompletionStatus,
): Promise<APIResult<MediaIsComplete>> {
	return API.put(`/media/${id}/progress/complete`, payload)
}

/**
 * Start the analysis of a book by media id.
 *
 * @param id The id for the book to analyze
 */
export function startMediaAnalysis(id: string) {
	API.post(`/media/${id}/analyze`)
}

export const mediaApi = {
	getInProgressMedia,
	getMedia,
	getMediaById,
	getMediaByPath,
	getMediaPage,
	getMediaThumbnail,
	getMediaWithCursor,
	getPaginatedMedia,
	getRecentlyAddedMedia,
	patchMediaThumbnail,
	putMediaCompletion,
	startMediaAnalysis,
	updateMediaProgress,
	uploadMediaThumbnail,
}

export const mediaQueryKeys: Record<keyof typeof mediaApi, string> = {
	getInProgressMedia: 'media.getInProgress',
	getMedia: 'media.get',
	getMediaById: 'media.getById',
	getMediaByPath: 'media.getByPath',
	getMediaPage: 'media.getPage',
	getMediaThumbnail: 'media.getThumbnail',
	getMediaWithCursor: 'media.getWithCursor',
	getPaginatedMedia: 'media.getPaginated',
	getRecentlyAddedMedia: 'media.getRecentlyAdded',
	patchMediaThumbnail: 'media.patchThumbnail',
	putMediaCompletion: 'media.putCompletion',
	startMediaAnalysis: 'media.startAnalysis',
	updateMediaProgress: 'media.updateProgress',
	uploadMediaThumbnail: 'media.uploadThumbnail',
}
