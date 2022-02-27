import API from '..';

export function getLibraries(): Promise<GetLibrariesResponse> {
	return API.get('/library');
}
