import type { Tag } from '@stump/types'

import { API } from './axios'
import { ApiResult } from './types'

export function getAllTags(): Promise<ApiResult<Tag[]>> {
	return API.get('/tags')
}

export function createTags(tags: string[]): Promise<ApiResult<Tag[]>> {
	return API.post('/tags', { tags })
}

const tagApi = {
	createTags,
	getAllTags,
}

export const tagQueryKeys: Record<keyof typeof tagApi, string> = {
	createTags: 'tag.createTags',
	getAllTags: 'tag.getAllTags',
}
