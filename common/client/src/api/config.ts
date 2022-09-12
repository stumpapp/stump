import { ApiResult } from '@stump/core';
import { API } from '.';

export function ping() {}

interface Claim {
	isClaimed: boolean;
}

export async function checkIsClaimed(): Promise<ApiResult<Claim>> {
	return API.get('/claim');
}
