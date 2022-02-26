// @ts-nocheck
import { baseUrl } from './lib/api';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { request } = event;
	const { headers } = request;

	console.log('handle.request.url', request.url);
	const cookies = headers.get('cookie');
	console.log('handle.cookies', cookies);

	// If there are no cookies, the user is not authenticated
	if (!cookies) {
		// @ts-ignore: TODO: fix this
		event.locals.user = null;
	}

	// @ts-ignore
	if (!event.locals.user) {
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
	}

	const response = await resolve(event);

	// set the cookie before making the request
	if (cookies) {
		response.headers.set('cookie', cookies);
	}

	return response;
};

/** @type {import('@sveltejs/kit').ExternalFetch} */
export async function externalFetch(request) {
	console.log('externalFetch', request.url);
	if (request.url.startsWith('http://localhost:6969/')) {
		const { headers } = request;

		const cookie = headers.get('cookie');
		console.log('externalFetch.cookie', cookie);

		if (cookie) {
			request.headers.set('cookie', cookie);
		}
	}

	return fetch(request, { credentials: 'include' });
}

// Sets session on client-side
// get in -> load({ session }) functions
export const getSession = async (request) => {
	return request.locals.user ?? {};
};
