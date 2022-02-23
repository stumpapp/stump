import * as cookie from 'cookie';
import { baseUrl } from './lib/api';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { request } = event;
	const { headers } = request;

	console.log('headers', headers);

	const cookies = headers.get('cookie');

	// If there are no cookies, the user is not authenticated
	if (!cookies) {
		// @ts-ignore: TODO: fix this
		event.locals.user = null;
	}

	const me = await fetch(baseUrl + '/api/auth/me', {
		credentials: 'include',
		headers: { cookie: cookies },
	})
		.then((res) => res.json())
		.catch(() => null);

	if (me) {
		// @ts-ignore: TODO: fix this
		event.locals.user = me;
	} else {
		// @ts-ignore: TODO: fix this
		event.locals.user = null;
	}

	const response = await resolve(event);

	return response;
};

// Sets session on client-side
// try console logging session in routes' load({ session }) functions
export const getSession = async (request) => {
	return request.locals.user ?? {};
};
