import { baseUrl } from '@/lib/api';

export const post = async ({ request }) => {
	const response = await fetch(`${baseUrl}/api/auth/login`, {
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify({ ...(await request.json()) }),
	});

	let body: unknown;

	try {
		body = await response.clone().json();
	} catch (e) {
		body = await response.text();
	}

	const headers = {
		'set-cookie': response.headers.get('set-cookie'),
	};

	return {
		status: response.status,
		headers,
		body,
	};
};
