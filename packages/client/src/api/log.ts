import type { ApiResult, LogMetadata } from '../types';
import { API } from '.';

export function getLogFileMeta(): Promise<ApiResult<LogMetadata>> {
	return API.get('/logs');
}

export function clearLogFile() {
	return API.delete('/logs');
}
