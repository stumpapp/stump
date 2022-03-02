import API, { baseURL } from '..';

export function getSeriesById(id: number): Promise<GetSeriesWithMedia> {
	return API.get(`/series/${id}`);
}

export function getSeriesThumbnail(id: number): string {
	return `${baseURL}/series/${id}/thumbnail`;
}
