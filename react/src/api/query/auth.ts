import API from '..';

export function me() {
	return API.get('/auth/me');
}

export function login(username: string, password: string) {
	return API.post('/auth/login', { username, password });
}
