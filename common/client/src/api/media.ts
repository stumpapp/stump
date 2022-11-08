import type { ApiResult, Media, PageableApiResult, ReadProgress } from '../types';
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

export function getRecentlyAddedMedia(
	page: number,
	params?: URLSearchParams,
): Promise<PageableApiResult<Media[]>> {
	console.log(page);
	if (params) {
		params.set('page', page.toString());
		return API.get(`/media/recently-added?${params.toString()}`);
	}

	return API.get(`/media/recently-added?page=${page}`);
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
