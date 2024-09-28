import { ApiVersion } from './api'

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
