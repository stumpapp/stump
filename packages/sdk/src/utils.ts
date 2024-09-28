import axios, { AxiosError } from 'axios'

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

export const isAxiosError = (error: unknown): error is AxiosError => {
	return axios.isAxiosError(error)
}
