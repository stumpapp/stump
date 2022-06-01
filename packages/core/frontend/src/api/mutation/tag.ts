import API from '..';

export function createTags(tags: string[]): Promise<ApiResult<Tag[]>> {
	return API.post('/tags', { tags });
}
