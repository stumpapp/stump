import type { StumpVersion } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function getStumpVersion(): Promise<ApiResult<StumpVersion>> {
	return API.post('/version')
}

const serverApi = {
	getStumpVersion,
}

export const serverQueryKeys: Record<keyof typeof serverApi, string> = {
	getStumpVersion: 'server.getStumpVersion',
}
