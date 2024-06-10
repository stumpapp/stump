import type { ClaimResponse } from '@stump/types'

import { API } from '.'
import { APIResult } from './types'

export function ping(): Promise<APIResult<string>> {
	return API.get('/ping')
}

export async function checkIsClaimed(): Promise<APIResult<ClaimResponse>> {
	return API.get('/claim')
}
