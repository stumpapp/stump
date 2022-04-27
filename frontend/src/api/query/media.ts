import API, { baseURL } from '..';

export function getMedia(): Promise<GetMediaResponse> {
	return API.get('/media');
}

export function getMediaById(id: string): Promise<GetMediaById> {
	return API.get(`/media/${id}`);
}

export function getMediaThumbnail(id: string): string {
	return `${baseURL}/media/${id}/thumbnail`;
}
