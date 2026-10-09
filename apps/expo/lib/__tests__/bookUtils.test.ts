import { describe, expect, it, vi } from 'vitest'

import { formatSeriesPosition } from '../bookUtils'

describe('bookUtils', () => {
	describe('formatSeriesPosition', () => {
		it('returns null if position is null or undefined', () => {
			const translate = vi.fn()
			expect(formatSeriesPosition(null, 5, { translate })).toBeNull()
			expect(formatSeriesPosition(undefined, 5, { translate })).toBeNull()
			expect(translate).not.toHaveBeenCalled()
		})

		it('properly handles all prefix options', () => {
			const translate = vi.fn()
			for (const prefix of [null, undefined, 'book', 'hashtag'] as const) {
				formatSeriesPosition(1, 3, {
					prefix,
					translate,
					// set so we don't worry about extra translation call
					seriesName: 'Murderbot Diaries',
				})
				const expectedPrefixKey = prefix === null ? 'none' : prefix === undefined ? 'book' : prefix
				expect(translate).toHaveBeenCalledWith(
					`shared.formatSeriesPosition.${expectedPrefixKey}.positionWithTotal`,
					expect.anything(),
				)
			}
		})

		it('calls translate with positionWithTotal key when position <= totalBooks', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, 3, { translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.book.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: undefined,
			})
		})

		it('calls translate with position key when totalBooks is null', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, null, { translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.book.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls translate with position key when totalBooks is undefined', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, undefined, { translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.book.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls translate with position key when totalBooks is 0', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, 0, { translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.book.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls translate with position key when position > totalBooks', () => {
			const translate = vi.fn()
			formatSeriesPosition(4, 3, { translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.book.position', {
				position: 4,
				total: 3,
				seriesName: undefined,
			})
		})

		it('passes decoded seriesName to translate', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, 3, { seriesName: 'Batman &amp; Robin', prefix: null, translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.none.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: 'Batman & Robin',
			})
		})

		it('passes decoded seriesName with multiple entities to translate', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, null, { seriesName: 'Q &amp; A&#039;s', prefix: null, translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.none.position', {
				position: 1,
				total: undefined,
				seriesName: "Q & A's",
			})
		})

		it('passes undefined seriesName to translate when seriesName is null', () => {
			const translate = vi.fn()
			formatSeriesPosition(1, 3, { seriesName: null, prefix: null, translate })
			expect(translate).toHaveBeenCalledWith('shared.formatSeriesPosition.none.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: undefined,
			})
		})
	})
})
