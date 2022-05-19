import API from '..';

// TODO: type this
export function scanLibary(id: string): Promise<unknown> {
	return API.get(`/libraries/${id}/scan`);
}

export function deleteLibrary(id: string) {
	return API.delete(`/libraries/${id}`);
}
