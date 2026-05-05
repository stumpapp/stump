import { formatSeriesPosition } from '../bookUtils'

describe('bookUtils', () => {
	describe('formatSeriesPosition', () => {
		it('returns null if position is null or undefined', () => {
			expect(formatSeriesPosition(null, 5)).toBeNull()
			expect(formatSeriesPosition(undefined, 5)).toBeNull()
		})

		it('formats fractional positions correctly (ignores totalBooks)', () => {
			expect(formatSeriesPosition(1.5, 5)).toBe('1.5 in series')
			expect(formatSeriesPosition(1.5, null)).toBe('1.5 in series')
		})

		it('formats integer positions without totalBooks', () => {
			expect(formatSeriesPosition(1, null)).toBe('1 in series')
			expect(formatSeriesPosition(1, undefined)).toBe('1 in series')
			expect(formatSeriesPosition(1, 0)).toBe('1 in series')
		})

		it('formats integer positions with totalBooks correctly', () => {
			expect(formatSeriesPosition(1, 3)).toBe('1 of 3')
			expect(formatSeriesPosition(3, 3)).toBe('3 of 3')
		})

		it('ignores totalBooks if position > totalBooks', () => {
			expect(formatSeriesPosition(4, 3)).toBe('4 in series')
		})

		it('applies prefix correctly', () => {
			expect(formatSeriesPosition(1, 3, { prefix: 'Book' })).toBe('Book 1 of 3')
			expect(formatSeriesPosition(1.5, 3, { prefix: 'Book' })).toBe('Book 1.5 in series')
			expect(formatSeriesPosition(1, null, { prefix: 'Issue' })).toBe('Issue 1 in series')
		})

		it('applies seriesName correctly', () => {
			expect(formatSeriesPosition(1, 3, { seriesName: 'Spiderman' })).toBe('1 of 3 in Spiderman')
			expect(formatSeriesPosition(1.5, 3, { seriesName: 'Spiderman' })).toBe('1.5 in Spiderman')
			expect(formatSeriesPosition(4, 3, { seriesName: 'Spiderman' })).toBe('4 in Spiderman')
		})

		it('decodes HTML entities in seriesName', () => {
			expect(formatSeriesPosition(1, 3, { seriesName: 'Batman &amp; Robin' })).toBe(
				'1 of 3 in Batman & Robin',
			)
			expect(formatSeriesPosition(1, null, { seriesName: 'Q &amp; A&#039;s' })).toBe("1 in Q & A's")
		})
	})
})
