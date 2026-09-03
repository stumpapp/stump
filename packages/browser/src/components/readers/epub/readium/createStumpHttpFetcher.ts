import { FetchImplementation, HttpFetcher } from '@readium/shared'
import { type Api } from '@stump/sdk'

/**
 * Build an authenticated fetch that attaches Stump credentials to every request.
 * Bearer tokens are sent when present; cookies are always included for session auth.
 */
export function createStumpFetch(sdk: Api): FetchImplementation {
	return (input, init) => {
		const headers = new Headers(init?.headers)

		const authorization = sdk.authorizationHeader
		if (authorization && !headers.has('Authorization')) {
			headers.set('Authorization', authorization)
		}

		return fetch(input, {
			...init,
			headers,
			credentials: 'include',
		})
	}
}

/**
 * HttpFetcher that streams EPUB package resources through Stump's authenticated API.
 */
export function createStumpHttpFetcher(sdk: Api, baseUrl?: string): HttpFetcher {
	return new HttpFetcher(createStumpFetch(sdk), baseUrl)
}
