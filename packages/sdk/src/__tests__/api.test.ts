import axios, { AxiosRequestHeaders, InternalAxiosRequestConfig } from 'axios'

import { Api } from '../api'

jest.mock('axios', () => ({
	...jest.requireActual('axios'),
	create: jest.fn(),
}))

const use = jest.fn()
const axiosInstance = {
	interceptors: {
		request: {
			use,
		},
	},
} as any

const getJwtPair = (fakeToken: string) => ({
	accessToken: fakeToken,
	refreshToken: 'refresh-me',
	expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
})

describe('Api', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(axios.create).mockReturnValue(axiosInstance)
	})

	describe('getters and setters', () => {
		it('should properly format the service URL', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' })
			expect(api.serviceURL).toBe('http://localhost:10801/api/v2')
		})

		it('should properly format the event source URL', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' })
			expect(api.eventSourceURL).toBe('http://localhost:10801/sse')
		})

		it('should properly handle double slashes in the URL', () => {
			expect(
				new Api({ baseURL: 'http://localhost:10801/', authMethod: 'session' }).serviceURL,
			).toBe('http://localhost:10801/api/v2')
			expect(
				new Api({ baseURL: 'http://localhost:10801//', authMethod: 'session' }).serviceURL,
			).toBe('http://localhost:10801/api/v2')
		})

		it('should get the auth method properly', () => {
			expect(
				new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' }).isTokenAuth,
			).toBe(false)
			expect(new Api({ baseURL: 'http://localhost:10801', authMethod: 'token' }).isTokenAuth).toBe(
				true,
			)
		})

		it('should get the token', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'token' })
			api.tokens = getJwtPair('give-me-access')
			expect(api.token).toBe('give-me-access')
		})

		it('should get a formatted auth header when a token is set', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'token' })
			api.tokens = getJwtPair('give-me-access')
			expect(api.authorizationHeader).toBe('Bearer give-me-access')
		})
	})

	describe('session auth', () => {
		it('should create an axios instance properly', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'session' })
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: 'http://localhost:10801/api/v2',
				withCredentials: true,
			})
			expect(api.axios).toBe(axiosInstance)
		})
	})

	describe('token auth', () => {
		it('should create an axios instance properly', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'token' })
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: 'http://localhost:10801/api/v2',
				withCredentials: false,
			})
			expect(api.axios).toBe(axiosInstance)
		})

		it('should set the auth header each request when token is set', () => {
			const api = new Api({ baseURL: 'http://localhost:10801', authMethod: 'token' })
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: 'http://localhost:10801/api/v2',
				withCredentials: false,
			})

			// Set the token
			api.tokens = getJwtPair('give-me-access')
			const config = {
				headers: {
					concat: jest.fn().mockImplementation((obj: unknown) => obj),
				} as unknown as AxiosRequestHeaders,
			} as InternalAxiosRequestConfig
			use.mock.calls[0][0](config)
			// The token should be set in the header
			expect(config.headers.Authorization === 'Bearer give-me-access')
		})

		// TODO: basic auth tests
	})
})
