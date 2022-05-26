import API from '..';

export function me(): Promise<ApiResult<UserWithPreferences>> {
	return API.get('/auth/me');
}

export function login(input: {
	username: string;
	password: string;
}): Promise<ApiResult<UserWithPreferences>> {
	return API.post('/auth/login', input);
}
