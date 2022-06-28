import API from '..';

export function getLibraries(): Promise<PageableApiResult<Library[]>> {
	return API.get('/libraries?unpaged=true');
}

export function getLibraryById(id: string): Promise<ApiResult<Library>> {
	return API.get(`/libraries/${id}`);
}

export function getLibrarySeries(id: string, page: number): Promise<PageableApiResult<Series[]>> {
	return API.get(`/libraries/${id}/series?page=${page}`);
}
