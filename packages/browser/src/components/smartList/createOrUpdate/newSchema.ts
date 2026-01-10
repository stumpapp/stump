import {
	LibraryFilterInput,
	MediaFilterInput,
	MediaMetadataFilterInput,
	SeriesFilterInput,
	SeriesMetadataFilterInput,
} from '@stump/graphql'
import { match } from 'ts-pattern'
import { z } from 'zod'

export const stringLikeOperator = z.enum([
	'eq',
	'neq',
	'like',
	'contains',
	'excludes',
	'startsWith',
	'endsWith',
])
export type StringLikeOperator = z.infer<typeof stringLikeOperator>

export const listOperator = z.enum(['anyOf', 'noneOf'])
export type ListOperator = z.infer<typeof listOperator>

export const numericOperator = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'range'])
export type NumericOperator = z.infer<typeof numericOperator>

export const operator = z.union([stringLikeOperator, listOperator, numericOperator])
export type Operator = z.infer<typeof operator>

export const range = z.object({
	from: z.union([z.date(), z.number()]),
	to: z.union([z.date(), z.number()]),
	inclusive: z.boolean().optional(),
})
export type Range = z.infer<typeof range>

export const stringField = z.enum([
	'name',
	'title',
	'path',
	'description',
	'summary',
	'notes',
	'genre',
	'writers',
	'pencillers',
	'inkers',
	'colorists',
	'letterers',
	'editors',
	'publisher',
	'colorists',
	'letterers',
	'coverArtists',
	'links',
	'characters',
	'teams',
	'comicid',
	'booktype',
	'status',
	'metaType',
])
export type StringField = z.infer<typeof stringField>
export const isStringField = (field: string): field is StringField =>
	stringField.safeParse(field).success

export const numberField = z.enum([
	'ageRating',
	'year',
	'day',
	'month',
	'pages',
	'pageCount',
	'size',
	'volume',
])
export type NumberField = z.infer<typeof numberField>
export const isNumberField = (field: string): field is NumberField =>
	numberField.safeParse(field).success

export const dateField = z.enum(['createdAt', 'updatedAt', 'completedAt'])
export type DateField = z.infer<typeof dateField>
export const isDateField = (field: string): field is DateField => dateField.safeParse(field).success
export const filter = z
	.object({
		field: z.string(),
		operator,
		source: z.enum(['book', 'book_meta', 'series', 'series_meta', 'library']),
		value: z.union([
			z.string(),
			z.string().array(),
			z.number(),
			z.number().array(),
			z.date(),
			range,
		]),
	})
	// strings may not use gt, gte, lt, lte, from
	.refine(
		(input) =>
			!(
				stringField.safeParse(input.field).success &&
				['gt', 'gte', 'lt', 'lte', 'from'].includes(input.operator)
			),
		{
			message: 'String fields may not use gt, gte, lt, lte, from',
		},
	)
export type FilterSchema = z.infer<typeof filter>
export type FilterSource = FilterSchema['source']

export const intoAPIFilter = (input: z.infer<typeof filter>): MediaFilterInput => {
	const fieldValue = match(input.operator)
		.with('range', () => input.value)
		.otherwise(() => ({ [input.operator]: input.value }))

	const converted = match(input.source)
		.with(
			'book',
			() =>
				({
					[input.field]: fieldValue,
				}) as MediaFilterInput,
		)
		.with('book_meta', () => ({
			metadata: {
				[input.field]: fieldValue,
			} as MediaMetadataFilterInput,
		}))
		.with('series', () => ({
			series: {
				[input.field]: fieldValue,
			} as SeriesFilterInput,
		}))
		.with('series_meta', () => ({
			series: {
				metadata: {
					[input.field]: fieldValue,
				},
			} as SeriesMetadataFilterInput,
		}))
		.with('library', () => ({
			series: {
				library: {
					[input.field]: fieldValue,
				} as LibraryFilterInput,
			} as SeriesFilterInput,
		}))
		.exhaustive()

	return converted
}
