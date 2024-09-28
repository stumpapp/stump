import axios, { InternalAxiosRequestConfig } from 'axios'

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

describe('Api', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		jest.mocked(axios.create).mockReturnValue(axiosInstance)
	})

	describe('getters and setters', () => {
		it('should properly format the service URL', () => {
			const api = new Api('http://localhost:10801', 'session')
			expect(api.serviceURL).toBe('http://localhost:10801/api/v1')
		})

		it('should properly format the event source URL', () => {
			const api = new Api('http://localhost:10801', 'session')
			expect(api.eventSourceURL).toBe('http://localhost:10801/sse')
		})

		it('should properly handle double slashes in the URL', () => {
			expect(new Api('http://localhost:10801/', 'session').serviceURL).toBe(
				'http://localhost:10801/api/v1',
			)
			expect(new Api('http://localhost:10801//', 'session').serviceURL).toBe(
				'http://localhost:10801/api/v1',
			)
		})

		it('should get the auth method properly', () => {
			expect(new Api('http://localhost:10801', 'session').isTokenAuth).toBe(false)
			expect(new Api('http://localhost:10801', 'token').isTokenAuth).toBe(true)
		})

		it('should get the token', () => {
			const api = new Api('http://localhost:10801', 'token')
			api.token = 'give-me-access'
			expect(api.token).toBe('give-me-access')
		})

		it('should get a formatted auth header when a token is set', () => {
			const api = new Api('http://localhost:10801', 'token')
			api.token = 'give-me-access'
			expect(api.authorizationHeader).toBe('Bearer give-me-access')
		})
	})

	describe('session auth', () => {
		it('should create an axious instance properly', () => {
			const api = new Api('http://localhost:10801', 'session')
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: 'http://localhost:10801/api/v1',
				withCredentials: true,
			})
			expect(api.axios).toBe(axiosInstance)
		})
	})

	describe('token auth', () => {
		it('should create an axious instance properly', () => {
			const api = new Api('http://localhost:10801', 'token')
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: 'http://localhost:10801/api/v1',
				withCredentials: false,
			})
			expect(api.axios).toBe(axiosInstance)
		})

		it('should set the auth header each request when token is set', () => {
			const api = new Api('http://localhost:10801', 'token')
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: 'http://localhost:10801/api/v1',
				withCredentials: false,
			})

			// Set the token
			api.token = 'give-me-access'
			const config = { headers: {} } as InternalAxiosRequestConfig
			use.mock.calls[0][0](config)
			// The token should be set in the header
			expect(config.headers.Authorization === 'Bearer give-me-access')
		})
	})
})
