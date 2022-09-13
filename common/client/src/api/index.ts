import axios, { AxiosInstance } from 'axios';

export * from './config';
export * from './series';
export * from './media';

export let API: AxiosInstance;

/**
 * Creates an axios instance with the given base URL and assigns it to the global
 * `API` variable.
 */
export function initializeApi(baseURL: string) {
	API = axios.create({
		baseURL,
		withCredentials: true,
	});
}

export function isUrl(url: string) {
	try {
		new URL(url);
		return true;
	} catch (e) {
		return false;
	}
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
