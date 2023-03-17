import type { Media, Series } from '@stump/types'

import { API, getMedia } from '.'
import { ApiResult, PageableApiResult } from './types'

export function getSeriesById(id: string): Promise<ApiResult<Series>> {
	return API.get(`/series/${id}`)
}

export function getSeriesMedia(
	id: string,
	page: number,
	params?: string,
): Promise<PageableApiResult<Media[]>> {
	if (params) {
		return API.get(`/series/${id}/media?page=${page}&${params}`)
	}

	return API.get(`/series/${id}/media?page=${page}`)
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
	return getMedia(
		new URLSearchParams({
			cursor: media_id,
			limit: limit.toString(),
			series_id,
		}),
	)
}

export function getSeriesThumbnail(id: string): string {
	return `${API.getUri()}/series/${id}/thumbnail`
}
