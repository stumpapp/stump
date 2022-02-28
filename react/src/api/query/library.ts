import API from '..';

export function getLibraries(): Promise<GetLibrariesResponse> {
	return API.get('/library');
}

export function getLibraryById(id: string): Promise<GetLibraryWithSeries> {
	return API.get(`/library/${id}`);
}
