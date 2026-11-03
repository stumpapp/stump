import { buildDays, toDateRange, toLevel } from '../range'

describe('toDateRange', () => {
	const now = new Date(2026, 10, 5) // Thu Nov 5, 2026

	it('should start the week, month and year presets at the start of the period', () => {
		expect(toDateRange('week', now)).toEqual({ start: '2026-11-01' })
		expect(toDateRange('month', now)).toEqual({ start: '2026-11-01' })
		expect(toDateRange('year', now)).toEqual({ start: '2026-01-01' })
	})

	it('should not bound the lifetime preset', () => {
		expect(toDateRange('lifetime', now)).toEqual({})
	})
})

describe('buildDays', () => {
	it('should include every day in the range, filling gaps with 0', () => {
		const days = buildDays('2025-12-30', '2026-01-02', new Map([['2025-12-31', 120]]))
		expect(days).toEqual([
			{ date: '2025-12-30', seconds: 0 },
			{ date: '2025-12-31', seconds: 120 },
			{ date: '2026-01-01', seconds: 0 },
			{ date: '2026-01-02', seconds: 0 },
		])
	})

	it('should return a single day when start and end match', () => {
		expect(buildDays('2026-03-01', '2026-03-01', new Map())).toHaveLength(1)
	})
})

describe('toLevel', () => {
	it('should scale activity from 0 to 4 relative to the max', () => {
		expect(toLevel(0, 100)).toBe(0)
		expect(toLevel(1, 100)).toBe(1)
		expect(toLevel(50, 100)).toBe(2)
		expect(toLevel(100, 100)).toBe(4)
		expect(toLevel(10, 0)).toBe(0)
	})
})
