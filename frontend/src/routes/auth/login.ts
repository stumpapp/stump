import api, { baseUrl } from '@/lib/api';
import * as cookie from 'cookie';

export const post = async ({ body }) => {
	const response = await fetch(`${baseUrl}/api/auth/login`, {
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify({ ...body }),
	});

	return {
		status: response.status,
		headers: response.headers,
		body: response.body,
	};
};
