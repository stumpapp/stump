import { isLibraryOrderBy, isMediaOrderBy, isSeriesOrderBy } from '../type-guards'

describe('type-guards', () => {
	describe('isMediaOrderBy', () => {
		it('should return true for basic media fields', () => {
			const assertions = [
				'name',
				'size',
				'extension',
				'created_at',
				'updated_at',
				'status',
				'path',
				'pages',
			]
			for (const value of assertions) {
				expect(isMediaOrderBy(value)).toBe(true)
			}
		})

		it('should return false for a string which is not a basic media field', () => {
			const assertions = ['foo', null, undefined, 3]
			for (const value of assertions) {
				expect(isMediaOrderBy(value)).toBe(false)
			}
		})

		it('should return false for an array', () => {
			expect(isMediaOrderBy([])).toBe(false)
		})

		it('should return true for a valid metadata object', () => {
			expect(isMediaOrderBy({ metadata: ['title'] })).toBe(true)
		})

		it('should return false for an invalid metadata object', () => {
			expect(isMediaOrderBy({ metadata: 'title' })).toBe(false)
		})
	})

	describe('isSeriesOrderBy', () => {
		it('should return true for basic series fields', () => {
			const assertions = ['name', 'created_at', 'updated_at', 'status', 'path', 'description']
			for (const value of assertions) {
				expect(isSeriesOrderBy(value)).toBe(true)
			}
		})

		it('should return false for a string which is not a basic series field', () => {
			const assertions = ['foo', null, undefined, 3]
			for (const value of assertions) {
				expect(isSeriesOrderBy(value)).toBe(false)
			}
		})
	})

	describe('isLibraryOrderBy', () => {
		it('should return true for basic library fields', () => {
			const assertions = ['name', 'created_at', 'updated_at', 'status', 'path']
			for (const value of assertions) {
				expect(isLibraryOrderBy(value)).toBe(true)
			}
		})

		it('should return false for a string which is not a basic library field', () => {
			const assertions = ['foo', null, undefined, 3]
			for (const value of assertions) {
				expect(isLibraryOrderBy(value)).toBe(false)
			}
		})
	})
})
