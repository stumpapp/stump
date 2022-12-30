import type { ApiResult, Tag } from '../types';
import { API } from '.';

export function getAllTags(): Promise<ApiResult<Tag[]>> {
	return API.get('/tags');
}

export function createTags(tags: string[]): Promise<ApiResult<Tag[]>> {
	return API.post('/tags', { tags });
}
