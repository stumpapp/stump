import axios, { isAxiosError } from 'axios'

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

	// We don't remove trailing slash for OPDS urls since we don't have
	// the knowledge of if they are needed like we do for internal API urls
	// See https://github.com/ajslater/codex/issues/524

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

	try {
		const response = await axios.head(url, { timeout: 5000 })
		return response.status < 500
	} catch (error) {
		const axiosError = isAxiosError(error) ? error : null
		if (axiosError?.code === 'ERR_NETWORK') {
			return false
		} else if (axiosError?.response) {
			return axiosError.response.status < 500 // Unauth is valid response to check
		}
		return false
	}
}

export const isNetworkError = (error: unknown) => {
	const axiosError = isAxiosError(error) ? error : null
	return axiosError?.code === 'ERR_NETWORK'
}

// This is pretty naive, but it looks for a few telltale signs of the outdated schema error, e.g.:
// - "Unknown argument "X" on field "Y"
// - "Cannot query field "X" on type "Y"
// - "Field "X" of type "Y" must have a selection of subfields"
export const isOutdatedGraphQLSchemaError = (error: unknown) => {
	if (error instanceof Error) {
		const message = error.message
		const patterns = [
			/Unknown argument ".*" on field ".*"/,
			/Cannot query field ".*" on type ".*"/,
			/Field ".*" of type ".*" must have a selection of subfields/,
		]
		return patterns.some((pattern) => pattern.test(message))
	}
	return false
}
