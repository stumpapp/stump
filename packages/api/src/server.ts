import type { ClaimResponse, StumpVersion, UpdateCheck } from '@stump/types'

import { API } from './axios'
import { ApiResult } from './types'

export function getStumpVersion(): Promise<ApiResult<StumpVersion>> {
	return API.post('/version')
}

export function checkForServerUpdate(): Promise<ApiResult<UpdateCheck>> {
	return API.get('/check-for-update')
}

export function ping() {
	return API.get('/ping')
}

export async function checkIsClaimed(): Promise<ApiResult<ClaimResponse>> {
	return API.get('/claim')
}

export const serverApi = {
	checkForServerUpdate,
	checkIsClaimed,
	getStumpVersion,
	ping,
}

export const serverQueryKeys: Record<keyof typeof serverApi, string> = {
	checkForServerUpdate: 'server.checkForServerUpdate',
	checkIsClaimed: 'server.checkIsClaimed',
	getStumpVersion: 'server.getStumpVersion',
	ping: 'server.ping',
}
