import {
	EntityVisibility,
	FieldFilterString,
	MediaFilterInput,
	NumericFilterI32,
	SmartListFilterInput,
	SmartListGrouping,
	SmartListGroupJoiner,
	SmartListJoiner,
} from '@stump/graphql'

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
		anyOf: ['foo', 'shmoo'],
	},
	{
		eq: 'baz',
	},
	{
		neq: 'bar',
	},
	{
		contains: 'f',
	},
	{
		excludes: 'z',
	},
	{
		noneOf: ['baz', 'qux'],
	},
] satisfies FieldFilterString[]
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
] as NumericFilterI32[]

describe('schema', () => {
	describe('intoFormFilter', () => {
		it('should convert basic smart filter into form filter', () => {
			for (const filter of stringFilters) {
				expect(
					intoFormFilter({
						media: { name: filter },
					} satisfies SmartListFilterInput),
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
				expect(
					intoFormFilter({
						media: { createdAt: filter },
					} satisfies SmartListFilterInput),
				).toEqual({
					field: 'createdAt',
					operation,
					source: 'book',
					value,
				})
			}
		})

		it('should convert smart filter with metadata into form filter', () => {
			for (const filter of stringFilters) {
				expect(
					intoFormFilter({
						media: { metadata: { genres: filter } },
					} satisfies SmartListFilterInput),
				).toEqual({
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
					intoFormFilter({
						media: { metadata: { ageRating: filter } },
					} satisfies SmartListFilterInput),
				).toEqual({
					field: 'ageRating',
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
					} satisfies SmartListFilterInput),
				).toEqual({
					field: 'name',
					operation: Object.keys(filter)[0],
					source: 'series',
					value: Object.values(filter)[0],
				})
			}
		})

		it('should convert smart filter with series meta into form filter', () => {
			for (const filter of stringFilters) {
				expect(
					intoFormFilter({
						series: {
							metadata: {
								title: filter,
							},
						},
					} satisfies SmartListFilterInput),
				).toEqual({
					field: 'title',
					operation: Object.keys(filter)[0],
					source: 'series_meta',
					value: Object.values(filter)[0],
				})
			}

			for (const filter of numericFilters) {
				const operation = 'from' in filter ? 'range' : Object.keys(filter)[0]
				const value = 'from' in filter ? filter : Object.values(filter)[0]
				expect(
					intoFormFilter({
						series: { metadata: { ageRating: filter } },
					} satisfies MediaFilterInput),
				).toEqual({
					field: 'ageRating',
					operation,
					source: 'series_meta',
					value,
				})
			}
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
					} satisfies MediaFilterInput),
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
					operation: 'anyOf',
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
					field: 'createdAt',
					operation: 'gte',
					source: 'book',
					value: 42,
				}),
			).toEqual({
				createdAt: {
					gte: 42,
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'createdAt',
					operation: 'range',
					source: 'book',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				createdAt: {
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
					operation: 'anyOf',
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
					field: 'ageRating',
					operation: 'gte',
					source: 'book_meta',
					value: 42,
				}),
			).toEqual({
				metadata: {
					ageRating: {
						gte: 42,
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'ageRating',
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
					ageRating: {
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
					operation: 'anyOf',
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
					field: 'createdAt',
					operation: 'gte',
					source: 'series',
					value: 42,
				}),
			).toEqual({
				series: {
					createdAt: {
						gte: 42,
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'createdAt',
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
					createdAt: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				},
			})
		})

		it('should convert smart filter form with series meta into API filter', () => {
			// String filter
			expect(
				intoAPIFilter({
					field: 'title',
					operation: 'anyOf',
					source: 'series_meta',
					value: ['foo', 'shmoo'],
				}),
			).toEqual({
				series: {
					metadata: {
						title: {
							any: ['foo', 'shmoo'],
						},
					},
				},
			})

			// Numeric filter (basic)
			expect(
				intoAPIFilter({
					field: 'ageRating',
					operation: 'gte',
					source: 'series_meta',
					value: 42,
				}),
			).toEqual({
				series: {
					metadata: {
						ageRating: {
							gte: 42,
						},
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'ageRating',
					operation: 'range',
					source: 'series_meta',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				series: {
					metadata: {
						ageRating: {
							from: 42,
							inclusive: true,
							to: 69,
						},
					},
				},
			})
		})

		it('should convert smart filter form with library into API filter', () => {
			// String filter
			expect(
				intoAPIFilter({
					field: 'name',
					operation: 'anyOf',
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
					field: 'createdAt',
					operation: 'gte',
					source: 'library',
					value: 42,
				}),
			).toEqual({
				series: {
					library: {
						createdAt: {
							gte: 42,
						},
					},
				},
			})

			// Numeric filter (complex)
			expect(
				intoAPIFilter({
					field: 'createdAt',
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
						createdAt: {
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
					groups: [
						{
							media: {
								_and: [
									{
										name: {
											anyOf: ['foo', 'shmoo'],
										},
									} satisfies MediaFilterInput,
									{
										name: {
											noneOf: ['bar', 'baz'],
										},
									} satisfies MediaFilterInput,
								],
							},
						},
					],
					joiner: SmartListGroupJoiner.And,
				}),
			).toEqual({
				filters: [
					{
						field: 'name',
						operation: 'anyOf',
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
					groups: [
						{
							media: {
								_or: [
									{
										metadata: {
											ageRating: {
												range: { from: 42, inclusive: true, to: 69 },
											},
										},
									},
									{
										createdAt: {
											lt: new Date('2021-01-01').toISOString(),
										},
									},
								],
							},
						},
					],
					joiner: SmartListGroupJoiner.Or,
				}),
			).toEqual({
				filters: [
					{
						field: 'ageRating',
						operation: 'range',
						source: 'book_meta',
						value: {
							from: 42,
							inclusive: true,
							to: 69,
						},
					},
					{
						field: 'createdAt',
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
							operation: 'anyOf',
							source: 'book',
							value: ['foo', 'shmoo'],
						},
						{
							field: 'name',
							operation: 'noneOf',
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
							field: 'ageRating',
							operation: 'range',
							source: 'book_meta',
							value: {
								from: 42,
								inclusive: true,
								to: 69,
							},
						},
						{
							field: 'createdAt',
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
							ageRating: {
								from: 42,
								inclusive: true,
								to: 69,
							},
						},
					},
					{
						createdAt: {
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
					defaultGrouping: SmartListGrouping.BySeries,
					description: 'baz',
					filters: [
						{
							groups: [
								{
									media: {
										_and: [
											{
												name: {
													anyOf: ['foo', 'shmoo'],
												},
											},
											{
												name: {
													noneOf: ['bar', 'baz'],
												},
											},
										],
									},
								},
							],
							joiner: SmartListGroupJoiner.And,
						},
						{
							groups: [
								{
									media: {
										_or: [
											{
												createdAt: {
													lt: new Date('2021-01-01').toISOString(),
												},
											},
										],
									},
								},
							],
							joiner: SmartListGroupJoiner.Or,
						},
					],
					id: 'foo',
					joiner: SmartListJoiner.Or,
					name: 'bar',
					visibility: EntityVisibility.Public,
				}),
			).toEqual({
				description: 'baz',
				filters: {
					groups: [
						{
							filters: [
								{
									field: 'name',
									operation: 'anyOf',
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
									field: 'createdAt',
									operation: 'lt',
									source: 'book',
									value: new Date('2021-01-01').toISOString(),
								},
							],
							joiner: 'or',
						},
					],
					joiner: 'or',
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
										operation: 'anyOf',
										source: 'book',
										value: ['foo', 'shmoo'],
									},
									{
										field: 'name',
										operation: 'noneOf',
										source: 'book',
										value: ['bar', 'baz'],
									},
								],
								joiner: 'and',
							},
							{
								filters: [
									{
										field: 'createdAt',
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
							or: [{ createdAt: { lt: 42 } }],
						},
					],
				},
				joiner: 'AND',
				name: 'bar',
				visibility: 'PUBLIC',
			})
		})
	})
})
