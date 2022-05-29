import API from '..';

interface CreateTag {
	name: string;
}

export function createTags(tags: CreateTag[]): Promise<ApiResult<Tag[]>> {
	return API.post('/tags', { tags });
}
