import { ApiResult, LogMetadata } from '@stump/core';
import { API } from '.';

export function getLogFileMeta(): Promise<ApiResult<LogMetadata>> {
	return API.get('/logs');
}

export function clearLogFile() {
	return API.delete('/logs');
}
