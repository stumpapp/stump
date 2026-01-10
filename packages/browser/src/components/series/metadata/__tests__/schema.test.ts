import {
	getEditorDefaultValues,
	isSeriesStatus,
	schema,
	seriesStatus,
	VALID_SERIES_STATUS,
} from '../schema'

describe('series metadata schema', () => {
	describe('validation', () => {
		it('should validate a complete valid object', () => {
			const validData = {
				ageRating: 13,
				booktype: 'Comic',
				characters: ['Batman', 'Joker'],
				comicid: 12345,
				genres: ['Superhero', 'Action'],
				imprint: 'DC Black Label',
				links: ['https://dc.com', 'https://comicvine.com'],
				metaType: 'Comic',
				publisher: 'DC Comics',
				status: 'Ongoing',
				summary: 'A great comic series about Batman',
				title: 'Batman',
				volume: 1,
				writers: ['Bob Kane', 'Bill Finger'],
			}

			const result = schema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toEqual(validData)
			}
		})

		it('should validate with minimal data', () => {
			const minimalData = {
				title: 'Test Series',
			}

			const result = schema.safeParse(minimalData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBe('Test Series')
			}
		})

		it('should validate with null/undefined values', () => {
			const dataWithNulls = {
				title: 'Test Series',
				ageRating: null,
				characters: undefined,
				publisher: null,
				comicid: undefined,
			}

			const result = schema.safeParse(dataWithNulls)
			expect(result.success).toBe(true)
		})
	})

	describe('transform function - empty string conversion', () => {
		it('should convert empty strings to null', () => {
			const dataWithEmptyStrings = {
				title: '',
				publisher: '   ',
				status: 'Ongoing',
				summary: '\t\n',
				booktype: 'Comic',
				imprint: '',
			}

			const result = schema.safeParse(dataWithEmptyStrings)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBeNull()
				expect(result.data.publisher).toBeNull()
				expect(result.data.status).toBe('Ongoing')
				expect(result.data.summary).toBeNull()
				expect(result.data.booktype).toBe('Comic')
				expect(result.data.imprint).toBeNull()
			}
		})

		it('should preserve valid strings and numbers', () => {
			const dataWithValidValues = {
				title: 'Batman',
				publisher: 'DC Comics',
				ageRating: 13,
				comicid: 12345,
				volume: 1,
				summary: 'A great story',
			}

			const result = schema.safeParse(dataWithValidValues)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBe('Batman')
				expect(result.data.publisher).toBe('DC Comics')
				expect(result.data.ageRating).toBe(13)
				expect(result.data.comicid).toBe(12345)
				expect(result.data.volume).toBe(1)
				expect(result.data.summary).toBe('A great story')
			}
		})

		it('should not affect non-string values', () => {
			const dataWithMixedTypes = {
				title: '',
				characters: ['Batman'],
				links: ['https://example.com'],
				volume: 2,
			}

			const result = schema.safeParse(dataWithMixedTypes)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBeNull() // string converted to null
				expect(result.data.characters).toEqual(['Batman']) // array preserved
				expect(result.data.links).toEqual(['https://example.com']) // array preserved
				expect(result.data.volume).toBe(2) // valid number preserved
			}
		})
	})

	describe('validation constraints', () => {
		it('should reject invalid age rating', () => {
			const result = schema.safeParse({ ageRating: -1 })
			expect(result.success).toBe(false)
		})

		it('should reject invalid volume', () => {
			const result = schema.safeParse({ volume: 0 })
			expect(result.success).toBe(false)
		})

		it('should reject invalid URLs in links', () => {
			const result = schema.safeParse({ links: ['not-a-url', 'also-invalid'] })
			expect(result.success).toBe(false)
		})

		it('should reject empty strings in string arrays', () => {
			const result = schema.safeParse({ characters: ['Batman', '', 'Joker'] })
			expect(result.success).toBe(false)
		})

		it('should accept valid URLs in links', () => {
			const result = schema.safeParse({
				links: ['https://example.com', 'http://test.org'],
			})
			expect(result.success).toBe(true)
		})
	})
})

describe('series status utilities', () => {
	describe('VALID_SERIES_STATUS', () => {
		it('should contain expected status values', () => {
			expect(VALID_SERIES_STATUS).toEqual([
				'Abandoned',
				'Ongoing',
				'Completed',
				'Cancelled',
				'Hiatus',
			])
		})
	})

	describe('seriesStatus enum', () => {
		it('should validate valid status values', () => {
			VALID_SERIES_STATUS.forEach((status) => {
				const result = seriesStatus.safeParse(status)
				expect(result.success).toBe(true)
				if (result.success) {
					expect(result.data).toBe(status)
				}
			})
		})

		it('should reject invalid status values', () => {
			const invalidStatuses = ['Invalid', 'NotAStatus', '', null, undefined]
			invalidStatuses.forEach((status) => {
				const result = seriesStatus.safeParse(status)
				expect(result.success).toBe(false)
			})
		})
	})

	describe('isSeriesStatus type guard', () => {
		it('should return true for valid series status values', () => {
			VALID_SERIES_STATUS.forEach((status) => {
				expect(isSeriesStatus(status)).toBe(true)
			})
		})

		it('should return false for invalid values', () => {
			const invalidValues = ['Invalid', 'NotAStatus', '', null, undefined, 123, {}, [], true]
			invalidValues.forEach((value) => {
				expect(isSeriesStatus(value)).toBe(false)
			})
		})
	})
})

describe('getEditorDefaultValues', () => {
	it('should return all null values when no data provided', () => {
		const result = getEditorDefaultValues()

		Object.values(result).forEach((value) => {
			expect(value).toBeNull()
		})

		expect(result.title).toBeNull()
		expect(result.publisher).toBeNull()
		expect(result.ageRating).toBeNull()
		expect(result.characters).toBeNull()
		expect(result.comicid).toBeNull()
		expect(result.genres).toBeNull()
		expect(result.imprint).toBeNull()
		expect(result.links).toBeNull()
		expect(result.metaType).toBeNull()
		expect(result.status).toBeNull()
		expect(result.summary).toBeNull()
		expect(result.volume).toBeNull()
		expect(result.writers).toBeNull()
		expect(result.booktype).toBeNull()
	})

	it('should return all null values when null data provided', () => {
		const result = getEditorDefaultValues(null)

		Object.values(result).forEach((value) => {
			expect(value).toBeNull()
		})
	})

	it('should parse and return transformed data when valid data provided', () => {
		const mockData = {
			title: 'Batman',
			publisher: '', // Should be transformed to null
			ageRating: 13,
			characters: ['Batman', 'Joker'],
			comicid: 12345,
			volume: 1,
		} as any

		const result = getEditorDefaultValues(mockData)

		expect(result.title).toBe('Batman')
		expect(result.publisher).toBeNull() // Empty string transformed to null
		expect(result.ageRating).toBe(13)
		expect(result.characters).toEqual(['Batman', 'Joker'])
		expect(result.comicid).toBe(12345)
		expect(result.volume).toBe(1)
	})

	it('should fallback to raw data when schema parsing fails', () => {
		const invalidData = {
			title: 'Batman',
			ageRating: -5, // Invalid age rating
			volume: 0, // Invalid volume
		} as any

		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const result = getEditorDefaultValues(invalidData)

		// Should return the raw data when parsing fails
		expect(result.title).toBe('Batman')
		expect(result.ageRating).toBe(-5)
		expect(result.volume).toBe(0)

		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to parse form from actual metadata',
			expect.any(Object),
		)

		consoleSpy.mockRestore()
	})

	it('should handle data with mixed valid and invalid fields', () => {
		const mixedData = {
			title: 'Valid Title',
			publisher: '   ', // "Empty" string - should become null
			ageRating: 16, // Valid
			comicid: 54321, // Valid number
			volume: 2, // Valid
			status: 'Ongoing', // Valid
			summary: '', // Empty string - should become null
		} as any

		const result = getEditorDefaultValues(mixedData)

		expect(result.title).toBe('Valid Title')
		expect(result.publisher).toBeNull()
		expect(result.ageRating).toBe(16)
		expect(result.comicid).toBe(54321)
		expect(result.volume).toBe(2)
		expect(result.status).toBe('Ongoing')
		expect(result.summary).toBeNull()
	})
})
