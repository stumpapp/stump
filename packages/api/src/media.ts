import type { Media, ReadProgress } from '@stump/types'

import { API } from './index'
import { ApiResult, CursorQueryParams, PageableApiResult } from './types'
import { urlWithParams } from './utils'

type GetMediaById = ApiResult<Media>

export function getMedia(params?: URLSearchParams): Promise<PageableApiResult<Media[]>> {
	return API.get(urlWithParams('/media', params))
}

export function getMediaWithCursor({
	afterId,
	limit,
	params,
}: CursorQueryParams): Promise<PageableApiResult<Media[]>> {
	const searchParams = new URLSearchParams(params)
	searchParams.set('cursor', afterId)
	if (limit) {
		searchParams.set('limit', limit.toString())
	}
	// searchParams.set('series_id', 'a3610abf-cba3-44a9-b5a0-d3d43f82ad41')

	return API.get(urlWithParams('/media', searchParams))
}

export function getPaginatedMedia(page: number): Promise<PageableApiResult<Media[]>> {
	return API.get(`/media?page=${page}`)
}

export function getMediaById(id: string): Promise<GetMediaById> {
	return API.get(`/media/${id}?load_series=true`)
}

// TODO: I see myself using this pattern a lot, so I should make a helper/wrapper for it...
export function getRecentlyAddedMedia(
	page: number,
	params?: URLSearchParams,
): Promise<PageableApiResult<Media[]>> {
	if (params) {
		params.set('page', page.toString())
		return API.get(urlWithParams('/media/recently-added', params))
	}

	return API.get(`/media/recently-added?page=${page}`)
}

export function getInProgressMedia(
	page: number,
	params?: URLSearchParams,
): Promise<PageableApiResult<Media[]>> {
	if (params) {
		params.set('page', page.toString())
		return API.get(urlWithParams('/media/keep-reading', params))
	}

	return API.get(`/media/keep-reading?page=${page}`)
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
