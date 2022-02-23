import { baseUrl } from '.';

export function getSeries(seriesId: number) {
	return fetch(`${baseUrl}/api/series/${seriesId}`);
}

// this really just creates the url, the img tag handles the rest
export function getSeriesThumbnail(seriesId: number) {
	return `${baseUrl}/api/series/${seriesId}/thumbnail`;
}
