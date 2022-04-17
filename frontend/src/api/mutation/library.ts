import API from '..';

// TODO: type this
export function scanLibary(id: number): Promise<unknown> {
	return API.get(`/library/${id}/scan`);
}
