import type { Media, PatchMediaThumbnail, ReadProgress } from '@stump/types'

import { API } from './index'
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

export const mediaApi = {
	getInProgressMedia,
	getMedia,
	getMediaById,
	getMediaPage,
	getMediaThumbnail,
	getMediaWithCursor,
	getPaginatedMedia,
	getRecentlyAddedMedia,
	patchMediaThumbnail,
	updateMediaProgress,
}

export const mediaQueryKeys: Record<keyof typeof mediaApi, string> = {
	getInProgressMedia: 'media.getInProgress',
	getMedia: 'media.get',
	getMediaById: 'media.getById',
	getMediaPage: 'media.getPage',
	getMediaThumbnail: 'media.getThumbnail',
	getMediaWithCursor: 'media.getWithCursor',
	getPaginatedMedia: 'media.getPaginated',
	getRecentlyAddedMedia: 'media.getRecentlyAdded',
	patchMediaThumbnail: 'media.patchThumbnail',
	updateMediaProgress: 'media.updateProgress',
}
