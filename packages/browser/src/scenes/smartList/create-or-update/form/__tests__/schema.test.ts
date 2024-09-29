import { Filter, MediaSmartFilter, NumericFilter, SeriesSmartFilter } from '@stump/types'

import { intoAPIFilter, intoFormFilter } from '../newSchema'

const stringFilters = [
	{
		any: ['foo', 'shmoo'],
	},
	{
		not: 'bar',
	},
	{
		contains: 'f',
	},
	{
		excludes: 'z',
	},
	{
		none: ['baz', 'qux'],
	},
] as Filter<string>[]
const numericFilters = [
	{
		eq: 42,
	},
	{
		gt: 42,
	},
	{
		gte: 42,
	},
	{
		lt: 42,
	},
	{
		lte: 42,
	},
	{
		from: 42,
		inclusive: true,
		to: 69,
	},
] as NumericFilter<number>[]

describe('schema', () => {
	describe('intoFormFilter', () => {
		it('should convert basic smart filter into form filter', () => {
			for (const filter of stringFilters) {
				expect(
					intoFormFilter({
						name: filter,
					} satisfies MediaSmartFilter),
				).toEqual({
					field: 'name',
					operation: Object.keys(filter)[0],
					source: 'book',
					value: Object.values(filter)[0],
				})
			}

			for (const filter of numericFilters) {
				const operation = 'from' in filter ? 'range' : Object.keys(filter)[0]
				const value = 'from' in filter ? filter : Object.values(filter)[0]
				expect(intoFormFilter({ created_at: filter } as unknown as MediaSmartFilter)).toEqual({
					field: 'created_at',
					operation,
					source: 'book',
					value,
				})
			}
		})

		it('should convert smart filter with metadata into form filter', () => {
			for (const filter of stringFilters) {
				expect(intoFormFilter({ metadata: { genre: filter } } satisfies MediaSmartFilter)).toEqual({
					field: 'genre',
					operation: Object.keys(filter)[0],
					source: 'book_meta',
					value: Object.values(filter)[0],
				})
			}

			for (const filter of numericFilters) {
				const operation = 'from' in filter ? 'range' : Object.keys(filter)[0]
				const value = 'from' in filter ? filter : Object.values(filter)[0]
				expect(
					intoFormFilter({ metadata: { age_rating: filter } } satisfies MediaSmartFilter),
				).toEqual({
					field: 'age_rating',
					operation,
					source: 'book_meta',
					value,
				})
			}
		})

		it('should convert smart filter with series into form filter', () => {
			for (const filter of stringFilters) {
				expect(
					intoFormFilter({
						series: {
							name: filter,
						},
					} satisfies MediaSmartFilter),
				).toEqual({
					field: 'name',
					operation: Object.keys(filter)[0],
					source: 'series',
					value: Object.values(filter)[0],
				})
			}

			// TODO: support series metadata
			// TODO: add numeric filters for series?
		})

		it('should convert smart filter with library into form filter', () => {
			for (const filter of stringFilters) {
				expect(
					intoFormFilter({
						series: {
							library: {
								name: filter,
							},
						},
					} satisfies MediaSmartFilter),
				).toEqual({
					field: 'name',
					operation: Object.keys(filter)[0],
					source: 'library',
					value: Object.values(filter)[0],
				})
			}
		})
	})

	describe('intoAPIFilter', () => {})
})
