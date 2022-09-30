import type { ApiResult } from '../types';
import { API } from '.';

export function getStumpVersion(): Promise<ApiResult<string>> {
	return API.get('/version');
}
