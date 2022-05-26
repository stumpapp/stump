import API from '..';

interface RegisterUserInput {
	username: string;
	password: string;
}

export function register(payload: RegisterUserInput) {
	return API.post('/auth/register', payload);
}
