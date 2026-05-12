import { describe, expect, it, vi } from 'vitest'

import { formatSeriesPosition } from '../bookUtils'

describe('bookUtils', () => {
	describe('formatSeriesPosition', () => {
		it('returns null if position is null or undefined', () => {
			const t = vi.fn()
			expect(formatSeriesPosition(null, 5, { t })).toBeNull()
			expect(formatSeriesPosition(undefined, 5, { t })).toBeNull()
			expect(t).not.toHaveBeenCalled()
		})

		it('properly handles all prefix options', () => {
			const t = vi.fn()
			for (const prefix of [null, undefined, 'book', 'hashtag'] as const) {
				formatSeriesPosition(1, 3, {
					prefix,
					t,
					// set so we don't worry about extra translation call
					seriesName: 'Murderbot Diaries',
				})
				const expectedPrefixKey = prefix === null ? 'none' : prefix === undefined ? 'book' : prefix
				expect(t).toHaveBeenCalledWith(
					`formatSeriesPosition.${expectedPrefixKey}.positionWithTotal`,
					expect.anything(),
				)
			}
		})

		it('calls t with positionWithTotal key when position <= totalBooks', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 3, { t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.book.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: undefined,
			})
		})

		it('calls t with position key when totalBooks is null', () => {
			const t = vi.fn()
			formatSeriesPosition(1, null, { t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.book.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls t with position key when totalBooks is undefined', () => {
			const t = vi.fn()
			formatSeriesPosition(1, undefined, { t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.book.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls t with position key when totalBooks is 0', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 0, { t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.book.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls t with position key when position > totalBooks', () => {
			const t = vi.fn()
			formatSeriesPosition(4, 3, { t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.book.position', {
				position: 4,
				total: 3,
				seriesName: undefined,
			})
		})

		it('passes decoded seriesName to t', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 3, { seriesName: 'Batman &amp; Robin', prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.none.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: 'Batman & Robin',
			})
		})

		it('passes decoded seriesName with multiple entities to t', () => {
			const t = vi.fn()
			formatSeriesPosition(1, null, { seriesName: 'Q &amp; A&#039;s', prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.none.position', {
				position: 1,
				total: undefined,
				seriesName: "Q & A's",
			})
		})

		it('passes undefined seriesName to t when seriesName is null', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 3, { seriesName: null, prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.none.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: undefined,
			})
		})
	})
})
