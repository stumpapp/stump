import axios, { AxiosInstance } from 'axios';

export * from './auth';
export * from './config';
export * from './epub';
export * from './series';
export * from './media';
export * from './job';
export * from './log';

export let API: AxiosInstance;

/**
 * Creates an axios instance with the given base URL and assigns it to the global
 * `API` variable.
 */
export function initializeApi(baseUrl: string) {
	let correctedUrl = baseUrl;

	// remove trailing slash
	if (correctedUrl.endsWith('/')) {
		// correctedUrl = correctedUrl.slice(0, -1);
	}

	// add api to end of URL, don't allow double slashes
	if (!correctedUrl.endsWith('/api')) {
		correctedUrl += '/api';
	}

	// remove all double slashes AFTER the initial http:// or https:// or whatever
	correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, '$1');

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

	const res = await fetch(`${url}/api/ping`).catch((err) => err);

	return res.status === 200;
}
