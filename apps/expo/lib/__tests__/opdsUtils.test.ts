import { constructSearchURL } from '../opdsUtils'

describe('constructSearchURL', () => {
	it('should return URL unchanged when no template section exists', () => {
		const url = '/opds/v2.0/search'
		expect(constructSearchURL(url, 'test')).toBe(url)
	})

	it('should replace {?query} with encoded query parameter', () => {
		const url = '/opds/v2.0/s/0/1{?query}'
		expect(constructSearchURL(url, 'search terms')).toBe('/opds/v2.0/s/0/1?query=search%20terms')
	})

	it('should handle query with special characters', () => {
		const url = '/opds/v2.0/search{?query}'
		expect(constructSearchURL(url, 'author & title')).toBe(
			'/opds/v2.0/search?query=author%20%26%20title',
		)
	})

	it('should preserve additional query params after template', () => {
		// See https://discord.com/channels/972593831172272148/1462953801169244312
		const url = '/opds/v2.0/s/0/1{?query}&topGroup=s'
		expect(constructSearchURL(url, 'some search terms')).toBe(
			'/opds/v2.0/s/0/1?query=some%20search%20terms&topGroup=s',
		)
	})

	it('should handle multiple params in template but only use query', () => {
		const url = '/opds/v2.0/s/0/1{?query,author}&topGroup=s'
		expect(constructSearchURL(url, 'search')).toBe('/opds/v2.0/s/0/1?query=search&topGroup=s')
	})

	it('should remove template when query param is not available', () => {
		const url = '/opds/v2.0/search{?author,title}'
		expect(constructSearchURL(url, 'test')).toBe('/opds/v2.0/search')
	})

	it('should handle empty query string', () => {
		const url = '/opds/v2.0/search{?query}'
		expect(constructSearchURL(url, '')).toBe('/opds/v2.0/search?query=')
	})

	it('should handle whitespace in template params', () => {
		const url = '/opds/v2.0/search{?query , author}'
		expect(constructSearchURL(url, 'book')).toBe('/opds/v2.0/search?query=book')
	})

	it('should reject non-templated URLs and return them unchanged', () => {
		const url = '/opds/v2.0/search?query=test'
		expect(constructSearchURL(url, 'new search')).toBe(url)
	})
})
