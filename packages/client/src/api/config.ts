import type { ApiResult, ClaimResponse } from '../types'
import { API } from '.'

export function ping() {
	return API.get('/ping')
}

export async function checkIsClaimed(): Promise<ApiResult<ClaimResponse>> {
	return API.get('/claim')
}
