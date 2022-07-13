import { ApiResult } from '@stump/core';
import API from '..';

interface RegisterUserInput {
	username: string;
	password: string;
}

export function register(payload: RegisterUserInput) {
	return API.post('/auth/register', payload);
}

export function logout(): Promise<ApiResult<any>> {
	return API.post('/auth/logout');
}
