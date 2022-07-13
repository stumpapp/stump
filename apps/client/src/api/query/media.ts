import { ApiResult, Media, PageableApiResult } from '@stump/core';
import API, { baseURL } from '..';

// type GetMediaResponse = ApiResult<Media[]>;
type GetMediaById = ApiResult<Media>;

export function getMedia(): Promise<PageableApiResult<Media[]>> {
	return API.get('/media?unpaged=true');
}

export function getPaginatedMedia(page: number): Promise<PageableApiResult<Media[]>> {
	return API.get(`/media?page=${page}`);
}

export function getMediaById(id: string): Promise<GetMediaById> {
	return API.get(`/media/${id}`);
}

export function getMediaThumbnail(id: string): string {
	return `${baseURL}/media/${id}/thumbnail`;
}

export function getMediaPage(id: string, page: number): string {
	return `${baseURL}/media/${id}/page/${page}`;
}
