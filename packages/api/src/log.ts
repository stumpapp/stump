import type { LogMetadata } from '@stump/types'

import { API } from '.'
import { ApiResult } from './types'

export function getLogFileMeta(): Promise<ApiResult<LogMetadata>> {
	return API.get('/logs')
}

export function clearLogFile() {
	return API.delete('/logs')
}
