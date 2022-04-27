import API from '..';

// TODO: type this
export function scanLibary(id: string): Promise<unknown> {
	return API.get(`/library/${id}/scan`);
}
