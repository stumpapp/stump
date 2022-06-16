import API from '..';

export function getAllTags(): Promise<ApiResult<Tag[]>> {
	return API.get('/tags');
}

export function createTags(tags: string[]) {
	return API.post('/tags', { tags });
}
