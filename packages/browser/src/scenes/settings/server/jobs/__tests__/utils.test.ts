import { CRON_PRESETS, getCronSchema } from '../utils'

describe('cronSchema', () => {
	const cronSchema = getCronSchema((key) => key)

	describe('valid expressions', () => {
		it('accepts a 5-field expression', () => {
			expect(cronSchema.safeParse('0 0 * * *').success).toBe(true)
		})

		it('accepts a 6-field expression with seconds', () => {
			expect(cronSchema.safeParse('0 0 0 * * *').success).toBe(true)
		})

		it('accepts a 7-field expression with year', () => {
			expect(cronSchema.safeParse('0 0 0 * * * 2025').success).toBe(true)
		})

		it('accepts named weekday', () => {
			expect(cronSchema.safeParse('0 0 * * FRI').success).toBe(true)
		})

		it('accepts named month', () => {
			expect(cronSchema.safeParse('0 0 1 JAN *').success).toBe(true)
		})

		it('accepts step syntax', () => {
			expect(cronSchema.safeParse('0 */6 * * *').success).toBe(true)
		})

		it('accepts range syntax', () => {
			expect(cronSchema.safeParse('0 9-17 * * 1-5').success).toBe(true)
		})

		it('accepts all built-in presets', () => {
			const presets = CRON_PRESETS.map((p) => p.value)
			for (const value of presets) {
				expect(cronSchema.safeParse(value).success).toBe(true)
			}
		})
	})

	describe('invalid expressions', () => {
		it('rejects an empty string', () => {
			expect(cronSchema.safeParse('').success).toBe(false)
		})

		it('rejects a plain string', () => {
			expect(cronSchema.safeParse('not-a-cronSchema').success).toBe(false)
		})

		it('rejects too few fields', () => {
			expect(cronSchema.safeParse('0 0 * *').success).toBe(false)
		})

		it('rejects too many fields', () => {
			expect(cronSchema.safeParse('0 0 0 * * * 2025 extra').success).toBe(false)
		})
	})
})
