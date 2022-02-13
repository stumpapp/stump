import { baseUrl } from '.';

export function getMediaById(mediaId: number) {
	return fetch(`${baseUrl}/api/media/${mediaId}`);
}

// this really just creates the url, the img tag handles the rest
export function getMediaThumbnail(mediaId: number) {
	return `${baseUrl}/api/series/${mediaId}/thumbnail`;
}
