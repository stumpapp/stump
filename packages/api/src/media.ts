import type { Media, ReadProgress } from '@stump/types'

import { API } from './index'
import { ApiResult, CursorQueryParams, PageableApiResult } from './types'
import { mergeCursorParams, urlWithParams } from './utils'

type GetMediaById = ApiResult<Media>

export function getMedia(filters?: Record<string, string>): Promise<PageableApiResult<Media[]>> {
	const params = new URLSearchParams(filters)
	return API.get(urlWithParams('/media', params))
}

export function getMediaWithCursor({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableApiResult<Media[]>> {
	const searchParams = mergeCursorParams({ afterId, limit, params })
	// searchParams.set('series_id', 'a3610abf-cba3-44a9-b5a0-d3d43f82ad41')

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

export function getMediaPage(id: string, page: number): string {
	return `${API.getUri()}/media/${id}/page/${page}`
}

export function updateMediaProgress(id: string, page: number): Promise<ReadProgress> {
	return API.put(`/media/${id}/progress/${page}`)
}

const mediaApi = {
	getInProgressMedia,
	getMedia,
	getMediaById,
	getMediaPage,
	getMediaThumbnail,
	getPaginatedMedia,
	getRecentlyAddedMedia,
	updateMediaProgress,
}

export const mediaQueryKeys: Record<keyof typeof mediaApi, string> = {
	getInProgressMedia: 'media.getInProgress',
	getMedia: 'media.get',
	getMediaById: 'media.getById',
	getMediaPage: 'media.getPage',
	getMediaThumbnail: 'media.getThumbnail',
	getPaginatedMedia: 'media.getPaginated',
	getRecentlyAddedMedia: 'media.getRecentlyAdded',
	updateMediaProgress: 'media.updateProgress',
}
