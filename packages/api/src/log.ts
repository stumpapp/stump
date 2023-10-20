import type { LogMetadata } from '@stump/types'

import { API } from './axios'
import { ApiResult } from './types'

export function getLogFileMeta(): Promise<ApiResult<LogMetadata>> {
	return API.get('/logs')
}

export function clearLogFile() {
	return API.delete('/logs')
}

const logApi = {
	clearLogFile,
	getLogFileMeta,
}

export const logQueryKeys: Record<keyof typeof logApi, string> = {
	clearLogFile: 'log.clearLogFile',
	getLogFileMeta: 'log.getLogFileMeta',
}
