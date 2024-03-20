import type { Log, LogMetadata } from '@stump/types'

import { API } from './axios'
import { APIResult, PageableAPIResult } from './types'
import { toUrlParams } from './utils'

export function getLogs(params?: Record<string, unknown>): Promise<PageableAPIResult<Log[]>> {
	if (params) {
		const searchParams = toUrlParams(params)
		return API.get(`/logs?${searchParams.toString()}`)
	} else {
		return API.get('/logs')
	}
}

export function getLogFileMeta(): Promise<APIResult<LogMetadata>> {
	return API.get('/logs/file/info')
}

export function clearLogFile() {
	return API.delete('/logs/file')
}

export const logApi = {
	clearLogFile,
	getLogFileMeta,
	getLogs,
}

export const logQueryKeys: Record<keyof typeof logApi, string> = {
	clearLogFile: 'log.clearLogFile',
	getLogFileMeta: 'log.getLogFileMeta',
	getLogs: 'log.getLogs',
}
