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
	return API.get(`/media/${id}?load_series=true`);
}

// TODO: I see myself using this pattern a lot, so I should make a helper/wrapper for it...
export function getRecentlyAddedMedia(
	page: number,
	params?: URLSearchParams,
): Promise<PageableApiResult<Media[]>> {
	if (params) {
		params.set('page', page.toString());
		return API.get(`/media/recently-added?${params.toString()}`);
	}

	return API.get(`/media/recently-added?page=${page}`);
}

export function getInProgressMedia(
	page: number,
	params?: URLSearchParams,
): Promise<PageableApiResult<Media[]>> {
	if (params) {
		params.set('page', page.toString());
		return API.get(`/media/keep-reading?${params.toString()}`);
	}

	return API.get(`/media/keep-reading?page=${page}`);
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
