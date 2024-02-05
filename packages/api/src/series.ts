import type { Media, PatchSeriesThumbnail, Series } from '@stump/types'

import { API } from './axios'
import { mediaApi } from './media'
import { APIResult, CursorQueryParams, PageableAPIResult, PagedQueryParams } from './types'
import { mergeCursorParams, mergePageParams, toUrlParams, urlWithParams } from './utils'

export function getSeries(filters?: Record<string, unknown>): Promise<PageableAPIResult<Series[]>> {
	const params = toUrlParams(filters)
	return API.get(urlWithParams('/series', params))
}

export function getSeriesById(
	id: string,
	params?: Record<string, unknown>,
): Promise<APIResult<Series>> {
	return API.get(urlWithParams(`/series/${id}`, toUrlParams(params)))
}

export function getSeriesWithCursor(
	params: CursorQueryParams,
): Promise<PageableAPIResult<Series[]>> {
	const searchParams = mergeCursorParams(params)
	return API.get(urlWithParams('/series', searchParams))
}

export function getSeriesMedia(
	id: string,
	{ page, page_size, params }: PagedQueryParams,
): Promise<PageableAPIResult<Media[]>> {
	const searchParams = mergePageParams({ page, page_size, params })
	return API.get(urlWithParams(`/series/${id}/media`, searchParams))
}

export function getRecentlyAddedSeries(
	page: number,
	params?: URLSearchParams,
): Promise<PageableAPIResult<Series[]>> {
	if (params) {
		params.set('page', page.toString())
		return API.get(`/series/recently-added?${params.toString()}`)
	}

	return API.get(`/series/recently-added?page=${page}`)
}

export function getNextInSeries(id: string): Promise<APIResult<Media | undefined>> {
	return API.get(`/series/${id}/media/next`)
}

/** Returns a list of media within a series, ordered after the cursor.
 *  Default limit is 25.
 * */
export function getNextMediaInSeries(
	series_id: string,
	media_id: string,
	limit = 25,
): Promise<PageableAPIResult<Media[]>> {
	return mediaApi.getMedia({
		cursor: media_id,
		limit: limit.toString(),
		series_id,
	})
}

export function getSeriesThumbnail(id: string): string {
	return `${API.getUri()}/series/${id}/thumbnail`
}

export function patchSeriesThumbnail(id: string, params: PatchSeriesThumbnail) {
	return API.patch(`/series/${id}/thumbnail`, params)
}

export function uploadSeriesThumbnail(id: string, file: File) {
	const formData = new FormData()
	formData.append('file', file)
	return API.post(`/series/${id}/thumbnail`, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	})
}

export const seriesApi = {
	getNextInSeries,
	getNextMediaInSeries,
	getRecentlyAddedSeries,
	getSeries,
	getSeriesById,
	getSeriesMedia,
	getSeriesThumbnail,
	getSeriesWithCursor,
	patchSeriesThumbnail,
	uploadSeriesThumbnail,
}

export const seriesQueryKeys: Record<keyof typeof seriesApi, string> = {
	getNextInSeries: 'series.getNextInSeries',
	getNextMediaInSeries: 'series.getNextMediaInSeries',
	getRecentlyAddedSeries: 'series.getRecentlyAddedSeries',
	getSeries: 'series.getSeries',
	getSeriesById: 'series.getSeriesById',
	getSeriesMedia: 'series.getSeriesMedia',
	getSeriesThumbnail: 'series.getSeriesThumbnail',
	getSeriesWithCursor: 'series.getSeriesWithCursor',
	patchSeriesThumbnail: 'series.patchSeriesThumbnail',
	uploadSeriesThumbnail: 'series.uploadSeriesThumbnail',
}
