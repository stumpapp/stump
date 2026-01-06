import { resolveUrl } from '../utils'

describe('resolveUrl', () => {
	describe('absolute URLs', () => {
		it('should return absolute http URLs unchanged', () => {
			expect(resolveUrl('http://other.com/path', 'http://example.com')).toBe(
				'http://other.com/path',
			)
		})
	})

	describe('relative URLs without baseUrl', () => {
		it('should return relative URL as-is when no baseUrl provided', () => {
			expect(resolveUrl('/path/to/resource')).toBe('/path/to/resource')
		})
	})

	describe('root-relative URLs (starting with /)', () => {
		// Note: Fix for https://github.com/stumpapp/stump/issues/878
		it('should resolve root-relative URL against origin of baseUrl', () => {
			// Scenario from the bug report:
			// - server URL: http://example.com/codex/opds/v2.0/r/0/1
			// - publication URL: /codex/opds/v2.0/p/2/1
			expect(resolveUrl('/codex/opds/v2.0/p/2/1', 'http://example.com/codex/opds/v2.0/r/0/1')).toBe(
				'http://example.com/codex/opds/v2.0/p/2/1',
			)
		})

		it('should resolve root-relative URL with baseUrl that has a path', () => {
			expect(resolveUrl('/new/path', 'http://example.com/old/path')).toBe(
				'http://example.com/new/path',
			)
		})

		it('should handle root-relative URL with query parameters', () => {
			expect(resolveUrl('/search?query=test', 'http://example.com/current')).toBe(
				'http://example.com/search?query=test',
			)
		})
	})
})
