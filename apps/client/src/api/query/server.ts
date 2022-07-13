import { ApiResult } from '@stump/core';
import API from '..';

interface Claim {
	isClaimed: boolean;
}

export async function checkIsClaimed(): Promise<ApiResult<Claim>> {
	return API.get('/claim');
}
