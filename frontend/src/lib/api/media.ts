import { baseUrl } from '.';

export function getMediaById(mediaId: number): Promise<Response> {
	return fetch(`${baseUrl}/api/media/${mediaId}`, { credentials: 'include' });
}

// this really just creates the url, the img tag handles the rest
export function getMediaThumbnail(mediaId: number): string {
	return `${baseUrl}/api/media/${mediaId}/thumbnail`;
}

export function getMediaPage(mediaId: number, page: number): string {
	return `${baseUrl}/api/media/${mediaId}/page/${page}`;
}

export function getMediaHtmlPage(mediaId: number, page: number): Promise<Response> {
	return fetch(`${baseUrl}/api/media/${mediaId}/page/${page}`);
}

export function getMediaFile(mediaId: number): string {
	return `${baseUrl}/api/media/${mediaId}/consume`;
}

export function updateProgress(mediaId: number, page: number): Promise<Response> {
	return fetch(`${baseUrl}/api/media/${mediaId}/progress`, {
		method: 'PUT',
		body: JSON.stringify({ page }),
	});
}
