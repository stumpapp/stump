import type { StumpVersion } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function getStumpVersion(): Promise<ApiResult<StumpVersion>> {
	return API.post('/version')
}
