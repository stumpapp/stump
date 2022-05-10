import API from '..';

export function me() {
	return API.get('/auth/me');
}

export function login(input: { username: string; password: string }) {
	return API.post('/auth/login', input);
}
