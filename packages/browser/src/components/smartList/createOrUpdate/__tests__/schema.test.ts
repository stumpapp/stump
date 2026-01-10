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
				const result = intoFormFilter({
					media: { name: filter },
				} satisfies SmartListFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'name',
						operation: Object.keys(filter)[0],
						source: 'book',
						value: Object.values(filter)[0],
					}),
				)
			}

			for (const filter of numericFilters) {
				const result = intoFormFilter({
					media: { createdAt: filter },
				} satisfies SmartListFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'createdAt',
						operation: Object.keys(filter)[0],
						source: 'book',
						value: Object.values(filter)[0],
					}),
				)
				expect(result).toHaveProperty('id')
			}
		})

		it('should convert smart filter with metadata into form filter', () => {
			for (const filter of stringFilters) {
				const result = intoFormFilter({
					media: { metadata: { genres: filter } },
				} satisfies SmartListFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'metadata',
						operation: 'genres',
						source: 'book',
						value: filter,
					}),
				)
			}

			for (const filter of numericFilters) {
				const result = intoFormFilter({
					media: { metadata: { ageRating: filter } },
				} satisfies SmartListFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'metadata',
						operation: 'ageRating',
						source: 'book',
						value: filter,
					}),
				)
			}
		})

		it('should convert smart filter with series into form filter', () => {
			for (const filter of stringFilters) {
				const result = intoFormFilter({
					series: {
						name: filter,
					},
				} satisfies SmartListFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'name',
						operation: Object.keys(filter)[0],
						source: 'series',
						value: Object.values(filter)[0],
					}),
				)
				expect(result).toHaveProperty('id')
			}
		})

		it('should convert smart filter with series meta into form filter', () => {
			for (const filter of stringFilters) {
				const result = intoFormFilter({
					series: {
						metadata: {
							title: filter,
						},
					},
				} satisfies SmartListFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'metadata',
						operation: 'title',
						source: 'series',
						value: filter,
					}),
				)
				expect(result).toHaveProperty('id')
			}

			for (const filter of numericFilters) {
				const result = intoFormFilter({
					series: { metadata: { ageRating: filter } },
				} satisfies MediaFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'metadata',
						operation: 'ageRating',
						source: 'series',
						value: filter,
					}),
				)
				expect(result).toHaveProperty('id')
			}
		})

		it('should convert smart filter with library into form filter', () => {
			for (const filter of stringFilters) {
				const result = intoFormFilter({
					series: {
						library: {
							name: filter,
						},
					},
				} satisfies MediaFilterInput)
				expect(result).toEqual(
					expect.objectContaining({
						field: 'library',
						operation: 'name',
						source: 'series',
						value: filter,
					}),
				)
				expect(result).toHaveProperty('id')
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
				media: {
					name: {
						anyOf: ['foo', 'shmoo'],
					},
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
				media: {
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
					source: 'book',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				media: {
					createdAt: {
						range: {
							from: 42,
							inclusive: true,
							to: 69,
						},
					},
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
				mediaMetadata: {
					genre: {
						anyOf: ['foo', 'shmoo'],
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
				mediaMetadata: {
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
				mediaMetadata: {
					ageRating: {
						range: {
							from: 42,
							inclusive: true,
							to: 69,
						},
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
						anyOf: ['foo', 'shmoo'],
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
						range: {
							from: 42,
							inclusive: true,
							to: 69,
						},
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
				seriesMetadata: {
					title: {
						anyOf: ['foo', 'shmoo'],
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
				seriesMetadata: {
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
					source: 'series_meta',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				seriesMetadata: {
					ageRating: {
						range: {
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
				library: {
					name: {
						anyOf: ['foo', 'shmoo'],
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
				library: {
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
					source: 'library',
					value: {
						from: 42,
						inclusive: true,
						to: 69,
					},
				}),
			).toEqual({
				library: {
					createdAt: {
						range: {
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
								name: {
									anyOf: ['foo', 'shmoo'],
								},
							},
						},
						{
							media: {
								name: {
									noneOf: ['bar', 'baz'],
								},
							},
						},
					],
					joiner: SmartListGroupJoiner.And,
				}),
			).toEqual({
				filters: [
					expect.objectContaining({
						field: 'name',
						operation: 'anyOf',
						source: 'book',
						value: ['foo', 'shmoo'],
					}),
					expect.objectContaining({
						field: 'name',
						operation: 'noneOf',
						source: 'book',
						value: ['bar', 'baz'],
					}),
				],
				joiner: 'and',
			})

			// Numeric filter
			expect(
				intoFormGroup({
					groups: [
						{
							media: {
								metadata: {
									ageRating: {
										range: { from: 42, inclusive: true, to: 69 },
									},
								},
							},
						},
						{
							media: {
								createdAt: {
									lt: new Date('2021-01-01').toISOString(),
								},
							},
						},
					],
					joiner: SmartListGroupJoiner.Or,
				}),
			).toEqual({
				filters: [
					expect.objectContaining({
						field: 'metadata',
						operation: 'ageRating',
						source: 'book',
						value: {
							range: { from: 42, inclusive: true, to: 69 },
						},
					}),
					expect.objectContaining({
						field: 'createdAt',
						operation: 'lt',
						source: 'book',
						value: new Date('2021-01-01').toISOString(),
					}),
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
				groups: [
					{
						media: {
							name: {
								anyOf: ['foo', 'shmoo'],
							},
						},
					},
					{
						media: {
							name: {
								noneOf: ['bar', 'baz'],
							},
						},
					},
				],
				joiner: 'AND',
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
				groups: [
					{
						mediaMetadata: {
							ageRating: {
								range: {
									from: 42,
									inclusive: true,
									to: 69,
								},
							},
						},
					},
					{
						media: {
							createdAt: {
								lt: 42,
							},
						},
					},
				],
				joiner: 'OR',
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
										name: {
											anyOf: ['foo', 'shmoo'],
										},
									},
								},
								{
									media: {
										name: {
											noneOf: ['bar', 'baz'],
										},
									},
								},
							],
							joiner: SmartListGroupJoiner.And,
						},
						{
							groups: [
								{
									media: {
										createdAt: {
											lt: new Date('2021-01-01').toISOString(),
										},
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
								expect.objectContaining({
									field: 'name',
									operation: 'anyOf',
									source: 'book',
									value: ['foo', 'shmoo'],
								}),
								expect.objectContaining({
									field: 'name',
									operation: 'noneOf',
									source: 'book',
									value: ['bar', 'baz'],
								}),
							],
							joiner: 'and',
						},
						{
							filters: [
								expect.objectContaining({
									field: 'createdAt',
									operation: 'lt',
									source: 'book',
									value: new Date('2021-01-01').toISOString(),
								}),
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
				defaultGrouping: 'BY_SERIES',
				description: 'baz',
				filters: [
					{
						groups: [
							{
								media: {
									name: {
										anyOf: ['foo', 'shmoo'],
									},
								},
							},
							{
								media: {
									name: {
										noneOf: ['bar', 'baz'],
									},
								},
							},
						],
						joiner: 'AND',
					},
					{
						groups: [
							{
								media: {
									createdAt: {
										lt: 42,
									},
								},
							},
						],
						joiner: 'OR',
					},
				],
				joiner: 'AND',
				name: 'bar',
				visibility: 'PUBLIC',
			})
		})
	})
})
