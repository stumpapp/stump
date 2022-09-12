import { ApiResult, Media, PageableApiResult, ReadProgress } from '@stump/core';
import { API } from '.';

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
	return `${API.getUri()}/media/${id}/thumbnail`;
}

export function getMediaPage(id: string, page: number): string {
	return `${API.getUri()}/media/${id}/page/${page}`;
}

export function updateMediaProgress(id: string, page: number): Promise<ReadProgress> {
	return API.put(`/media/${id}/progress/${page}`);
}
