import type { Tag } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function getAllTags(): Promise<ApiResult<Tag[]>> {
	return API.get('/tags')
}

export function createTags(tags: string[]): Promise<ApiResult<Tag[]>> {
	return API.post('/tags', { tags })
}
