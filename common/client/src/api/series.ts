import type { ApiResult, Media, PageableApiResult, Series } from '../types';
import { API } from '.';

export function getSeriesById(id: string): Promise<ApiResult<Series>> {
	return API.get(`/series/${id}`);
}

export function getSeriesMedia(
	id: string,
	page: number,
	params?: string,
): Promise<PageableApiResult<Media[]>> {
	if (params) {
		return API.get(`/series/${id}/media?page=${page}&${params}`);
	}

	return API.get(`/series/${id}/media?page=${page}`);
}

export function getRecentlyAddedSeries(page: number): Promise<PageableApiResult<Series[]>> {
	return API.get(`/series/recently-added?page=${page}`);
}

export function getNextInSeries(id: string): Promise<ApiResult<Media | undefined>> {
	return API.get(`/series/${id}/media/next`);
}

export function getSeriesThumbnail(id: string): string {
	return `${API.getUri()}/series/${id}/thumbnail`;
}
