import type { ClaimResponse } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function ping(): Promise<ApiResult<string>> {
	return API.get('/ping')
}

export async function checkIsClaimed(): Promise<ApiResult<ClaimResponse>> {
	return API.get('/claim')
}
