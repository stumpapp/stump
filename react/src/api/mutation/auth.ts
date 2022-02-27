import API from '..';

export function register(username: string, password: string) {
	return API.post('/auth/register', { username, password });
}
