import type {
	Media,
	MediaIsComplete,
	PatchMediaThumbnail,
	PutMediaCompletionStatus,
	ReadProgress,
} from '@stump/types'

import { API } from './axios'
import { ApiResult, CursorQueryParams, PageableApiResult } from './types'
import { mergeCursorParams, toUrlParams, urlWithParams } from './utils'

type GetMediaById = ApiResult<Media>

export function getMedia(filters?: Record<string, unknown>): Promise<PageableApiResult<Media[]>> {
	const params = toUrlParams(filters)
	return API.get(urlWithParams('/media', params))
}

export function getMediaWithCursor({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableApiResult<Media[]>> {
	const searchParams = mergeCursorParams({ afterId, limit, params })
	return API.get(urlWithParams('/media', searchParams))
}

export function getPaginatedMedia(page: number): Promise<PageableApiResult<Media[]>> {
	return API.get(`/media?page=${page}`)
}

export function getMediaById(id: string): Promise<GetMediaById> {
	return API.get(`/media/${id}?load_series=true`)
}

export function getMediaByPath(path: string): Promise<ApiResult<Media>> {
	return API.get(`/media/path/${encodeURIComponent(path)}`)
}

export function getRecentlyAddedMedia({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableApiResult<Media[]>> {
	const searchParams = mergeCursorParams({ afterId, limit, params })
	return API.get(urlWithParams('/media/recently-added', searchParams))
}

export function getInProgressMedia({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableApiResult<Media[]>> {
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

export function updateMediaProgress(id: string, page: number): Promise<ApiResult<ReadProgress>> {
	return API.put(`/media/${id}/progress/${page}`)
}

export function patchMediaThumbnail(id: string, params: PatchMediaThumbnail) {
	return API.patch(`/media/${id}/thumbnail`, params)
}

export function putMediaCompletion(
	id: string,
	payload: PutMediaCompletionStatus,
): Promise<ApiResult<MediaIsComplete>> {
	return API.put(`/media/${id}/complete`, payload)
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
	updateMediaProgress,
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
	updateMediaProgress: 'media.updateProgress',
}
