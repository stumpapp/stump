import { getEditorDefaultValues, schema } from '../schema'

describe('metadata schema', () => {
	describe('validation', () => {
		it('should validate a complete valid object', () => {
			const validData = {
				ageRating: 13,
				characters: ['Batman', 'Joker'],
				colorists: ['John Doe'],
				coverArtists: ['Jane Smith'],
				day: 15,
				editors: ['Editor One'],
				identifierAmazon: 'B08N5WRWNW',
				identifierCalibre: '12345',
				identifierGoogle: 'google123',
				identifierIsbn: '978-3-16-148410-0',
				identifierMobiAsin: 'B08N5WRWNW',
				identifierUuid: '123e4567-e89b-12d3-a456-426614174000',
				genres: ['Superhero', 'Action'],
				inkers: ['Inker One'],
				language: 'en',
				letterers: ['Letterer One'],
				links: ['https://example.com'],
				month: 6,
				number: 1,
				notes: 'Some notes about this book',
				pageCount: 32,
				pencillers: ['Penciller One'],
				publisher: 'DC Comics',
				series: 'Batman',
				summary: 'A great comic about Batman',
				teams: ['Justice League'],
				title: 'Batman #1',
				titleSort: 'Batman 001',
				volume: 1,
				writers: ['Bob Kane'],
				year: 2023,
			}

			const result = schema.safeParse(validData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toEqual(validData)
			}
		})

		it('should validate with minimal data', () => {
			const minimalData = {
				title: 'Test Title',
			}

			const result = schema.safeParse(minimalData)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBe('Test Title')
			}
		})

		it('should validate with null/undefined values', () => {
			const dataWithNulls = {
				title: 'Test Title',
				ageRating: null,
				characters: undefined,
				publisher: null,
			}

			const result = schema.safeParse(dataWithNulls)
			expect(result.success).toBe(true)
		})
	})

	describe('transform function - empty string to null conversion', () => {
		it('should convert empty strings to null', () => {
			const dataWithEmptyStrings = {
				title: '',
				publisher: '   ',
				series: 'Valid Series',
				summary: '\t\n',
				language: 'en',
				notes: '',
			}

			const result = schema.safeParse(dataWithEmptyStrings)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBeNull()
				expect(result.data.publisher).toBeNull()
				expect(result.data.series).toBe('Valid Series')
				expect(result.data.summary).toBeNull()
				expect(result.data.language).toBe('en')
				expect(result.data.notes).toBeNull()
			}
		})

		it('should preserve non-empty strings', () => {
			const dataWithValidStrings = {
				title: 'Batman #1',
				publisher: 'DC Comics',
				summary: 'A great story',
				notes: 'Important notes',
			}

			const result = schema.safeParse(dataWithValidStrings)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBe('Batman #1')
				expect(result.data.publisher).toBe('DC Comics')
				expect(result.data.summary).toBe('A great story')
				expect(result.data.notes).toBe('Important notes')
			}
		})

		it('should not affect non-string values', () => {
			const dataWithMixedTypes = {
				title: '',
				ageRating: 0,
				pageCount: 32,
				characters: ['Batman'],
				links: ['https://example.com'],
				day: 1,
				month: 1,
				year: 2023,
			}

			const result = schema.safeParse(dataWithMixedTypes)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.title).toBeNull() // string converted to null
				expect(result.data.ageRating).toBe(0) // number preserved
				expect(result.data.pageCount).toBe(32) // number preserved
				expect(result.data.characters).toEqual(['Batman']) // array preserved
				expect(result.data.links).toEqual(['https://example.com']) // array preserved
				expect(result.data.day).toBe(1) // number preserved
				expect(result.data.month).toBe(1) // number preserved
				expect(result.data.year).toBe(2023) // number preserved
			}
		})
	})

	describe('validation constraints', () => {
		it('should reject invalid age rating', () => {
			const result = schema.safeParse({ ageRating: -1 })
			expect(result.success).toBe(false)
		})

		it('should reject invalid day', () => {
			const result1 = schema.safeParse({ day: 0 })
			const result2 = schema.safeParse({ day: 32 })
			expect(result1.success).toBe(false)
			expect(result2.success).toBe(false)
		})

		it('should reject invalid month', () => {
			const result1 = schema.safeParse({ month: 0 })
			const result2 = schema.safeParse({ month: 13 })
			expect(result1.success).toBe(false)
			expect(result2.success).toBe(false)
		})

		it('should reject invalid year', () => {
			const currentYear = new Date().getFullYear()
			const result1 = schema.safeParse({ year: 1899 })
			const result2 = schema.safeParse({ year: currentYear + 1 })
			expect(result1.success).toBe(false)
			expect(result2.success).toBe(false)
		})

		it('should reject invalid page count', () => {
			const result = schema.safeParse({ pageCount: 0 })
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

		it('should coerce number strings to numbers', () => {
			const result = schema.safeParse({ number: '42' })
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.number).toBe(42)
			}
		})
	})
})

describe('getEditorDefaultValues', () => {
	it('should return all null values when no data provided', () => {
		const result = getEditorDefaultValues()

		// Check that all values are null
		Object.values(result).forEach((value) => {
			expect(value).toBeNull()
		})

		expect(result.title).toBeNull()
		expect(result.publisher).toBeNull()
		expect(result.ageRating).toBeNull()
		expect(result.characters).toBeNull()
	})

	it('should return all null values when null data provided', () => {
		const result = getEditorDefaultValues(null)

		Object.values(result).forEach((value) => {
			expect(value).toBeNull()
		})
	})

	it('should parse and return transformed data when valid data provided', () => {
		const mockData = {
			title: 'Batman #1',
			publisher: '', // Should be transformed to null
			ageRating: 13,
			characters: ['Batman', 'Joker'],
		} as any

		const result = getEditorDefaultValues(mockData)

		expect(result.title).toBe('Batman #1')
		expect(result.publisher).toBeNull() // Empty string transformed to null
		expect(result.ageRating).toBe(13)
		expect(result.characters).toEqual(['Batman', 'Joker'])
	})

	it('should fallback to raw data when schema parsing fails', () => {
		const invalidData = {
			title: 'Batman #1',
			ageRating: -5, // Invalid age rating
			day: 50, // Invalid day
		} as any

		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

		const result = getEditorDefaultValues(invalidData)

		expect(result.title).toBe('Batman #1')
		expect(result.ageRating).toBe(-5)
		expect(result.day).toBe(50)

		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to parse form from actual metadata',
			expect.any(Object),
		)

		consoleSpy.mockRestore()
	})
})
