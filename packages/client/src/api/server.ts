import type { ApiResult, StumpVersion } from '../types';
import { API } from '.';

export function getStumpVersion(): Promise<ApiResult<StumpVersion>> {
	return API.post('/version');
}
