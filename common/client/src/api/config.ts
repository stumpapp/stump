import { ApiResult, ClaimResponse } from '@stump/core';
import { API } from '.';

export function ping() {}

export async function checkIsClaimed(): Promise<ApiResult<ClaimResponse>> {
	return API.get('/claim');
}
