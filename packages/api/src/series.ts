import type { Media, PatchSeriesThumbnail, Series } from '@stump/types'

import { API, mediaApi, mergeCursorParams, mergePageParams, toUrlParams, urlWithParams } from '.'
import { ApiResult, CursorQueryParams, PageableApiResult, PagedQueryParams } from './types'

export function getSeries(filters?: Record<string, unknown>): Promise<PageableApiResult<Series[]>> {
	const params = toUrlParams(filters)
	return API.get(urlWithParams('/series', params))
}

export function getSeriesById(
	id: string,
	params?: Record<string, unknown>,
): Promise<ApiResult<Series>> {
	return API.get(urlWithParams(`/series/${id}`, toUrlParams(params)))
}

export function getSeriesWithCursor(
	params: CursorQueryParams,
): Promise<PageableApiResult<Series[]>> {
	const searchParams = mergeCursorParams(params)
	return API.get(urlWithParams('/series', searchParams))
}

export function getSeriesMedia(
	id: string,
	{ page, page_size, params }: PagedQueryParams,
): Promise<PageableApiResult<Media[]>> {
	const searchParams = mergePageParams({ page, page_size, params })
	return API.get(urlWithParams(`/series/${id}/media`, searchParams))
}

export function getRecentlyAddedSeries(
	page: number,
	params?: URLSearchParams,
): Promise<PageableApiResult<Series[]>> {
	if (params) {
		params.set('page', page.toString())
		return API.get(`/series/recently-added?${params.toString()}`)
	}

	return API.get(`/series/recently-added?page=${page}`)
}

export function getNextInSeries(id: string): Promise<ApiResult<Media | undefined>> {
	return API.get(`/series/${id}/media/next`)
}

/** Returns a list of media within a series, ordered after the cursor.
 *  Default limit is 25.
 * */
export function getNextMediaInSeries(
	series_id: string,
	media_id: string,
	limit = 25,
): Promise<PageableApiResult<Media[]>> {
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
}
