import type { ClaimResponse, StumpVersion } from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'

export function getStumpVersion(): Promise<APIResult<StumpVersion>> {
	return API.post('/version')
}

export function ping() {
	return API.get('/ping')
}

export async function checkIsClaimed(): Promise<APIResult<ClaimResponse>> {
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
