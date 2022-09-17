import { ApiResult } from '@stump/core';
import { API } from '.';

export function getStumpVersion(): Promise<ApiResult<string>> {
	return API.get('/version');
}
