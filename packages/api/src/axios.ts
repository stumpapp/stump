import axios, { AxiosInstance } from 'axios'

export let API: AxiosInstance

// TODO: make not bad
export function initializeApi(baseUrl: string, version: string) {
	let correctedUrl = baseUrl

	// remove trailing slash
	if (correctedUrl.endsWith('/')) {
		correctedUrl = correctedUrl.slice(0, -1)
	}

	const isValid = correctedUrl.endsWith(`/api/${version}`)
	const hasApiPiece = !isValid && correctedUrl.endsWith('/api')

	if (!isValid && !hasApiPiece) {
		correctedUrl += `/api/${version}`
	} else if (hasApiPiece) {
		correctedUrl += `/${version}`
	}

	// remove all double slashes AFTER the initial http:// or https:// or whatever
	correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, '$1')

	API = axios.create({
		baseURL: correctedUrl,
		// FIXME: react-native seems to ignore this option, causing brackets to be encoded which
		// the backend doesn't support
		// paramsSerializer: {
		// 	encode: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
		// },
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
