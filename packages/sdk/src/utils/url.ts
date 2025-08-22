import { isAxiosError } from 'axios'

import { ApiVersion } from '../api'

export const formatApiURL = (url: string, version: ApiVersion) => {
	let correctedUrl = url

	// Remove trailing slash
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

	// Remove all double slashes AFTER the initial http://, https://, etc
	correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, '$1')

	return correctedUrl
}

export const formatOPDSURL = (url: string) => {
	let correctedUrl = url

	// Remove trailing slash
	if (correctedUrl.endsWith('/')) {
		correctedUrl = correctedUrl.slice(0, -1)
	}

	// if (correctedUrl.endsWith('/api')) {
	// 	correctedUrl = correctedUrl.slice(0, -4)
	// }

	// Remove all double slashes AFTER the initial http://, https://, etc
	correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, '$1')

	return correctedUrl
}

// TODO: make not bad
export function isUrl(url: string) {
	return url.startsWith('http://') || url.startsWith('https://')
}

export async function checkUrl(url: string) {
	if (!isUrl(url)) {
		return false
	}

	const res = await fetch(`${url}/ping`).catch((err) => err)

	return res.status === 200
}

export async function checkOPDSURL(url: string) {
	if (!isUrl(url)) {
		return false
	}

	const res = await fetch(url).catch((err) => err)

	return res.status === 200
}

export const isNetworkError = (error: unknown) => {
	const axiosError = isAxiosError(error) ? error : null
	return axiosError?.code === 'ERR_NETWORK'
}
