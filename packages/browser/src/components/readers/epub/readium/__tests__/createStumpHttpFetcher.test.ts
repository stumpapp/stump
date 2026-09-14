import { type Api } from '@stump/sdk'

import { createStumpFetch } from '../createStumpHttpFetcher'

describe('createStumpFetch', () => {
	const originalFetch = global.fetch

	afterEach(() => {
		global.fetch = originalFetch
		vi.restoreAllMocks()
	})

	it('attaches Authorization and credentials include', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
		global.fetch = fetchMock as typeof fetch

		const sdk = { authorizationHeader: 'Bearer test-token' } as Api
		const stumpFetch = createStumpFetch(sdk)
		await stumpFetch('https://example.com/resource')

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(init.credentials).toBe('include')
		expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token')
	})

	it('does not overwrite an existing Authorization header', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
		global.fetch = fetchMock as typeof fetch

		const sdk = { authorizationHeader: 'Bearer test-token' } as Api
		const stumpFetch = createStumpFetch(sdk)
		await stumpFetch('https://example.com/resource', {
			headers: { Authorization: 'Bearer existing' },
		})

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(new Headers(init.headers).get('Authorization')).toBe('Bearer existing')
	})
})
