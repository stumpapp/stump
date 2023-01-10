import axios, { AxiosInstance } from 'axios'

export let API: AxiosInstance

// TODO: make not bad
export function initializeApi(baseUrl: string, version: string) {
	let correctedUrl = baseUrl
	console.log(correctedUrl)

	// remove trailing slash
	if (correctedUrl.endsWith('/')) {
		correctedUrl = correctedUrl.slice(0, -1)
	}
	console.log(correctedUrl)

	// add api to end of URL, don't allow double slashes
	if (!correctedUrl.endsWith(`/api/${version}`)) {
		correctedUrl += `/api/${version}`
	}
	console.log(correctedUrl)

	// remove all double slashes AFTER the initial http:// or https:// or whatever
	correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, '$1')

	console.log(correctedUrl)

	API = axios.create({
		baseURL: correctedUrl,
		withCredentials: true,
	})
}

export function apiIsInitialized() {
	return !!API
}

// TODO: make not bad
export function isUrl(url: string) {
	return url.startsWith('http://') || url.startsWith('https://')
}

export async function checkUrl(url: string, version = 'v1') {
	if (!isUrl(url)) {
		return false
	}

	const res = await fetch(`${url}/api/${version}/ping`).catch((err) => err)

	return res.status === 200
}
