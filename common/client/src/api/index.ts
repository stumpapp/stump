import axios, { AxiosInstance } from 'axios';

export * from './auth';
export * from './config';
export * from './epub';
export * from './series';
export * from './media';

export let API: AxiosInstance;

/**
 * Creates an axios instance with the given base URL and assigns it to the global
 * `API` variable.
 */
export function initializeApi(baseUrl: string) {
	let correctedUrl = baseUrl;

	// add /api to end of URL, don't allow double slashes
	if (!correctedUrl.endsWith('/')) {
		correctedUrl += '/';
	}
	if (!correctedUrl.endsWith('api/')) {
		correctedUrl += 'api/';
	}

	API = axios.create({
		baseURL: correctedUrl,
		withCredentials: true,
	});
}

// TODO: be better lol
export function isUrl(url: string) {
	return url.startsWith('http://') || url.startsWith('https://');
}

export async function checkUrl(url: string) {
	if (!isUrl(url)) {
		return false;
	}

	const res = await fetch(`${url}/api/ping`);

	console.log('Got response', res);

	// TODO: check response...
	return res.status === 200;
}
