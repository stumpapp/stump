import { ApiResult, Media, PageableApiResult, Series } from '@stump/core';
import API, { baseURL } from '..';

export function getSeriesById(id: string): Promise<ApiResult<Series>> {
	return API.get(`/series/${id}`);
}

export function getSeriesMedia(id: string, page: number): Promise<PageableApiResult<Media[]>> {
	return API.get(`/series/${id}/media?page=${page}`);
}

export function getNextInSeries(id: string): Promise<ApiResult<Media | undefined>> {
	return API.get(`/series/${id}/media/next`);
}

export function getSeriesThumbnail(id: string): string {
	return `${baseURL}/series/${id}/thumbnail`;
}
