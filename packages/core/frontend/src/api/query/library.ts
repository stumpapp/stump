import API from '..';

export function getLibraries(): Promise<ApiResult<Library[]>> {
	return API.get('/libraries');
}

export function getLibraryById(id: string): Promise<ApiResult<Library>> {
	return API.get(`/libraries/${id}`);
}
