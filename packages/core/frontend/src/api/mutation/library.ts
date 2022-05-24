import API from '..';

// TODO: type this
export function scanLibary(id: string): Promise<unknown> {
	return API.get(`/libraries/${id}/scan`);
}

// TODO: type this
export function deleteLibrary(id: string) {
	return API.delete(`/libraries/${id}`);
}

export function createLibrary({
	name,
	path,
	description,
}: CreateLibraryInput): Promise<ApiResult<Library>> {
	return API.post('/libraries', { name, path, description });
}
