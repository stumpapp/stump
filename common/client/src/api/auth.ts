import type { ApiResult, LoginOrRegisterArgs, User } from '../types';
import { API } from '.';

// TODO: types

export function me(): Promise<ApiResult<User>> {
	return API.get('/auth/me');
}

export function login(input: LoginOrRegisterArgs): Promise<ApiResult<User>> {
	return API.post('/auth/login', input);
}

export function register(payload: LoginOrRegisterArgs) {
	return API.post('/auth/register', payload);
}

export function logout(): Promise<ApiResult<unknown>> {
	return API.post('/auth/logout');
}
