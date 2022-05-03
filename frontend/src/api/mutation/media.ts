import API from '..';

export function updateMediaProgress(id: String, page: number): Promise<ReadProgress> {
	return API.put(`/media/${id}/${page}`);
}
