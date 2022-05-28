import API, { baseURL } from '..';

export function getSeriesById(id: string): Promise<ApiResult<Series>> {
	return API.get(`/series/${id}`);
}

export function getSeriesThumbnail(id: string): string {
	return `${baseURL}/series/${id}/thumbnail`;
}
