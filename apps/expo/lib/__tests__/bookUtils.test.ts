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

		it('calls t with positionWithTotal key when position <= totalBooks', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 3, { prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: undefined,
			})
		})

		it('calls t with position key when totalBooks is null', () => {
			const t = vi.fn()
			formatSeriesPosition(1, null, { prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls t with position key when totalBooks is undefined', () => {
			const t = vi.fn()
			formatSeriesPosition(1, undefined, { prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls t with position key when totalBooks is 0', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 0, { prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.position', {
				position: 1,
				total: undefined,
				seriesName: undefined,
			})
		})

		it('calls t with position key when position > totalBooks', () => {
			const t = vi.fn()
			formatSeriesPosition(4, 3, { prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.position', {
				position: 4,
				total: 3,
				seriesName: undefined,
			})
		})

		it('returns t result directly when prefix is null', () => {
			const t = vi.fn().mockReturnValue('1 of 3')
			expect(formatSeriesPosition(1, 3, { prefix: null, t })).toBe('1 of 3')
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.unknownSeriesName')
		})

		it('uses default prefix when prefix is not provided', () => {
			const t = vi
				.fn()
				.mockReturnValueOnce('series') // unknownSeriesName call
				.mockReturnValueOnce('1 of 3') // primaryClause call
				.mockReturnValueOnce('Book') // common.book call
			const result = formatSeriesPosition(1, 3, { t })
			expect(t).toHaveBeenCalledWith('common.book')
			expect(result).toBe('Book 1 of 3')
		})

		it('prepends a custom prefix to the result of t', () => {
			const t = vi.fn().mockReturnValue('1 of 3')
			expect(formatSeriesPosition(1, 3, { prefix: '#', t })).toBe('#1 of 3')
		})

		it('passes decoded seriesName to t', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 3, { seriesName: 'Batman &amp; Robin', prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: 'Batman & Robin',
			})
		})

		it('passes decoded seriesName with multiple entities to t', () => {
			const t = vi.fn()
			formatSeriesPosition(1, null, { seriesName: 'Q &amp; A&#039;s', prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.position', {
				position: 1,
				total: undefined,
				seriesName: "Q & A's",
			})
		})

		it('passes undefined seriesName to t when seriesName is null', () => {
			const t = vi.fn()
			formatSeriesPosition(1, 3, { seriesName: null, prefix: null, t })
			expect(t).toHaveBeenCalledWith('formatSeriesPosition.positionWithTotal', {
				position: 1,
				total: 3,
				seriesName: undefined,
			})
		})
	})
})
