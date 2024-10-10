import { Filter, MediaSmartFilter, NumericFilter } from '@stump/types'

import {
	intoAPI,
	intoAPIFilter,
	intoAPIGroup,
	intoForm,
	intoFormFilter,
	intoFormGroup,
} from '../schema'

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

	describe('intoAPIFilter', () => {
		it('should convert basic smart filter form into API filter', () => {
			// String filter
			expect(
				intoAPIFilter({
					field: 'name',
					operation: 'any',
					source: 'book',
					value: ['foo', 'shmoo'],
				}),
			).toEqual({
				name: {
					any: ['foo', 'shmoo'],
				},
			})

			// Numeric filter (basic)
			expect(
				intoAPIFilter({
					field: 'created_at',
					operation: 'gte',
					source: 'book',
					value: 42,
				}),
			).toEqual({
				created_at: {
					gte: 42,
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'created_at',
					operation: 'range',
					source: 'book',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				created_at: {
					from: 42,
					inclusive: true,
					to: 69,
				},
			})
		})

		it('should convert smart filter form with metadata into API filter', () => {
			// String filter
			expect(
				intoAPIFilter({
					field: 'genre',
					operation: 'any',
					source: 'book_meta',
					value: ['foo', 'shmoo'],
				}),
			).toEqual({
				metadata: {
					genre: {
						any: ['foo', 'shmoo'],
					},
				},
			})

			// Numeric filter (basic)
			expect(
				intoAPIFilter({
					field: 'age_rating',
					operation: 'gte',
					source: 'book_meta',
					value: 42,
				}),
			).toEqual({
				metadata: {
					age_rating: {
						gte: 42,
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'age_rating',
					operation: 'range',
					source: 'book_meta',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				metadata: {
					age_rating: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				},
			})
		})

		it('should convert smart filter form with series into API filter', () => {
			// String filter
			expect(
				intoAPIFilter({
					field: 'name',
					operation: 'any',
					source: 'series',
					value: ['foo', 'shmoo'],
				}),
			).toEqual({
				series: {
					name: {
						any: ['foo', 'shmoo'],
					},
				},
			})

			// Numeric filter (basic)
			expect(
				intoAPIFilter({
					field: 'created_at',
					operation: 'gte',
					source: 'series',
					value: 42,
				}),
			).toEqual({
				series: {
					created_at: {
						gte: 42,
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'created_at',
					operation: 'range',
					source: 'series',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				series: {
					created_at: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				},
			})
		})

		it('should convert smart filter form with library into API filter', () => {
			// String filter
			expect(
				intoAPIFilter({
					field: 'name',
					operation: 'any',
					source: 'library',
					value: ['foo', 'shmoo'],
				}),
			).toEqual({
				series: {
					library: {
						name: {
							any: ['foo', 'shmoo'],
						},
					},
				},
			})

			// Numeric filter (basic)
			expect(
				intoAPIFilter({
					field: 'created_at',
					operation: 'gte',
					source: 'library',
					value: 42,
				}),
			).toEqual({
				series: {
					library: {
						created_at: {
							gte: 42,
						},
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'created_at',
					operation: 'range',
					source: 'library',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				series: {
					library: {
						created_at: {
							from: 42,
							inclusive: true,
							to: 69,
						},
					},
				},
			})
		})
	})

	describe('intoFormGroup', () => {
		it('should convert basic smart filter into form group', () => {
			// String filter
			expect(
				intoFormGroup({
					and: [
						{
							name: {
								any: ['foo', 'shmoo'],
							},
						} satisfies MediaSmartFilter,
						{
							name: {
								none: ['bar', 'baz'],
							},
						} satisfies MediaSmartFilter,
					],
				}),
			).toEqual({
				filters: [
					{
						field: 'name',
						operation: 'any',
						source: 'book',
						value: ['foo', 'shmoo'],
					},
					{
						field: 'name',
						operation: 'none',
						source: 'book',
						value: ['bar', 'baz'],
					},
				],
				joiner: 'and',
			})

			// Numeric filter
			expect(
				intoFormGroup({
					or: [
						{
							metadata: {
								age_rating: {
									from: 42,
									inclusive: true,
									to: 69,
								},
							},
						} satisfies MediaSmartFilter,
						{
							created_at: {
								lt: new Date('2021-01-01').toISOString(),
							},
						} satisfies MediaSmartFilter,
					],
				}),
			).toEqual({
				filters: [
					{
						field: 'age_rating',
						operation: 'range',
						source: 'book_meta',
						value: {
							from: 42,
							inclusive: true,
							to: 69,
						},
					},
					{
						field: 'created_at',
						operation: 'lt',
						source: 'book',
						value: new Date('2021-01-01').toISOString(),
					},
				],
				joiner: 'or',
			})
		})
	})

	describe('intoAPIGroup', () => {
		it('should convert basic smart filter form group into API group', () => {
			// String filter
			expect(
				intoAPIGroup({
					filters: [
						{
							field: 'name',
							operation: 'any',
							source: 'book',
							value: ['foo', 'shmoo'],
						},
						{
							field: 'name',
							operation: 'none',
							source: 'book',
							value: ['bar', 'baz'],
						},
					],
					joiner: 'and',
				}),
			).toEqual({
				and: [
					{
						name: {
							any: ['foo', 'shmoo'],
						},
					},
					{
						name: {
							none: ['bar', 'baz'],
						},
					},
				],
			})

			// Numeric filter
			expect(
				intoAPIGroup({
					filters: [
						{
							field: 'age_rating',
							operation: 'range',
							source: 'book_meta',
							value: {
								from: 42,
								inclusive: true,
								to: 69,
							},
						},
						{
							field: 'created_at',
							operation: 'lt',
							source: 'book',
							value: 42,
						},
					],
					joiner: 'or',
				}),
			).toEqual({
				or: [
					{
						metadata: {
							age_rating: {
								from: 42,
								inclusive: true,
								to: 69,
							},
						},
					},
					{
						created_at: {
							lt: 42,
						},
					},
				],
			})
		})
	})

	describe('intoForm', () => {
		it('should convert a smart filter into a form', () => {
			expect(
				intoForm({
					default_grouping: 'BY_SERIES',
					description: 'baz',
					filters: {
						groups: [
							{
								and: [
									{
										name: {
											any: ['foo', 'shmoo'],
										},
									},
									{
										name: {
											none: ['bar', 'baz'],
										},
									},
								],
							},
							{
								or: [{ created_at: { lt: new Date('2021-01-01').toISOString() } }],
							},
						],
						joiner: 'OR',
					},
					id: 'foo',
					joiner: 'AND',
					name: 'bar',
					visibility: 'PUBLIC',
				}),
			).toEqual({
				description: 'baz',
				filters: {
					groups: [
						{
							filters: [
								{
									field: 'name',
									operation: 'any',
									source: 'book',
									value: ['foo', 'shmoo'],
								},
								{
									field: 'name',
									operation: 'none',
									source: 'book',
									value: ['bar', 'baz'],
								},
							],
							joiner: 'and',
						},
						{
							filters: [
								{
									field: 'created_at',
									operation: 'lt',
									source: 'book',
									value: new Date('2021-01-01').toISOString(),
								},
							],
							joiner: 'or',
						},
					],
					joiner: 'and',
				},
				grouping: 'BY_SERIES',
				name: 'bar',
				visibility: 'PUBLIC',
			})
		})
	})

	describe('intoAPI', () => {
		it('should convert a form representation into an API representation', () => {
			expect(
				intoAPI({
					description: 'baz',
					filters: {
						groups: [
							{
								filters: [
									{
										field: 'name',
										operation: 'any',
										source: 'book',
										value: ['foo', 'shmoo'],
									},
									{
										field: 'name',
										operation: 'none',
										source: 'book',
										value: ['bar', 'baz'],
									},
								],
								joiner: 'and',
							},
							{
								filters: [
									{
										field: 'created_at',
										operation: 'lt',
										source: 'book',
										value: 42,
									},
								],
								joiner: 'or',
							},
						],
						joiner: 'and',
					},
					grouping: 'BY_SERIES',
					name: 'bar',
					visibility: 'PUBLIC',
				}),
			).toEqual({
				default_grouping: 'BY_SERIES',
				description: 'baz',
				filters: {
					groups: [
						{
							and: [
								{
									name: {
										any: ['foo', 'shmoo'],
									},
								},
								{
									name: {
										none: ['bar', 'baz'],
									},
								},
							],
						},
						{
							or: [{ created_at: { lt: 42 } }],
						},
					],
					joiner: 'AND',
				},
				name: 'bar',
				visibility: 'PUBLIC',
			})
		})
	})
})
