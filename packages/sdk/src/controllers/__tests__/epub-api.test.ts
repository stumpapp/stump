import type { AxiosInstance } from 'axios'

import { Api } from '../../api'
import { EpubAPI } from '../epub-api'

describe('EpubAPI.search', () => {
	it('forwards query params and AbortSignal', async () => {
		const get = jest.fn().mockResolvedValue({
			data: {
				query: 'Alice',
				results: [],
				truncated: false,
				nextCursor: null,
			},
		})
		const axiosInstance = { get } as unknown as AxiosInstance
		const api = {
			axios: axiosInstance,
			serviceURL: 'http://localhost/api/v2',
		} as unknown as Api

		const epub = new EpubAPI(api)
		const signal = new AbortController().signal
		const response = await epub.search({
			id: 'book-1',
			q: 'Alice',
			limit: 10,
			cursor: 'abc',
			signal,
		})

		expect(response.query).toBe('Alice')
		expect(get).toHaveBeenCalledTimes(1)
		const [url, config] = get.mock.calls[0]
		expect(url).toContain('/epub/book-1/search')
		expect(url).toContain('q=Alice')
		expect(url).toContain('limit=10')
		expect(url).toContain('cursor=abc')
		expect(config).toEqual({ signal })
	})

	it('exposes a search query key', () => {
		const api = {
			axios: {} as AxiosInstance,
			serviceURL: 'http://localhost/api/v2',
		} as unknown as Api
		expect(new EpubAPI(api).keys.search).toBe('epub.search')
	})
})
