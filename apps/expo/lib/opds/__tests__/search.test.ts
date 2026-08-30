import { constructLegacySearchURL, constructSearchURL } from '../search'

// what a fckn annoying workaround. tldr; upgrading node introduced an issue where, at least from
// my understanding, the usage of `typeof` is causing vitest to throw: `SyntaxError: Unexpected token 'typeof'`
// there is an open issue for this but it is not resolved and no workaround was working for me:
// https://github.com/react/react-native/issues/50052
// so in the meantime, i just mocked the function from utils that search needs so that the import doesn't
// blow up (since typeof is used a bit in utils)
vi.mock('../utils', () => ({
	hasLinkRel: vi.fn().mockImplementation((link, target) => {
		const rel = link.rel
		if (Array.isArray(rel)) return rel.includes(target)
		return rel === target
	}),
}))

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

describe('constructLegacySearchURL', () => {
	it('should replace {searchTerms} with encoded query', () => {
		const url = '/opds/v1.2/series?search={searchTerms}'
		expect(constructLegacySearchURL(url, 'Fire')).toBe('/opds/v1.2/series?search=Fire')
	})

	it('should handle query with spaces', () => {
		const url = '/opds/v1.2/series?search={searchTerms}'
		expect(constructLegacySearchURL(url, 'Fire Power')).toBe(
			'/opds/v1.2/series?search=Fire%20Power',
		)
	})

	it('should return URL unchanged when no template exists', () => {
		const url = '/opds/v1.2/series?search=existing'
		expect(constructLegacySearchURL(url, 'new')).toBe(url)
	})

	it('should handle empty query string', () => {
		const url = '/opds/v1.2/series?search={searchTerms}'
		expect(constructLegacySearchURL(url, '')).toBe('/opds/v1.2/series?search=')
	})

	it('should replace multiple placeholders if present', () => {
		const url = '/opds/v1.2/search?q={searchTerms}&author={author}'
		expect(constructLegacySearchURL(url, 'test')).toBe('/opds/v1.2/search?q=test&author=test')
	})
})
