import { ApiResult, User } from '@stump/core';
import API from '.';

export function me(): Promise<ApiResult<User>> {
	return API.get('/auth/me');
}

export function login(input: { username: string; password: string }): Promise<ApiResult<User>> {
	return API.post('/auth/login', input);
}

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
