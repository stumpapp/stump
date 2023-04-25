import type { ClaimResponse, StumpVersion } from '@stump/types'

import { API } from './axios'
import { ApiResult } from './types'

export function getStumpVersion(): Promise<ApiResult<StumpVersion>> {
	return API.post('/version')
}

export function ping() {
	return API.get('/ping')
}

export async function checkIsClaimed(): Promise<ApiResult<ClaimResponse>> {
	return API.get('/claim')
}

const serverApi = {
	checkIsClaimed,
	getStumpVersion,
	ping,
}

export const serverQueryKeys: Record<keyof typeof serverApi, string> = {
	checkIsClaimed: 'server.checkIsClaimed',
	getStumpVersion: 'server.getStumpVersion',
	ping: 'server.ping',
}
