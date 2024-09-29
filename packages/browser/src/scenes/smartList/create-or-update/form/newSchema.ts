import {
	LibrarySmartFilter,
	MediaMetadataSmartFilter,
	MediaSmartFilter,
	SeriesSmartFilter,
} from '@stump/types'
import getProperty from 'lodash/get'
import { match } from 'ts-pattern'
import { z } from 'zod'

export const operation = z.enum([
	'gt',
	'gte',
	'lt',
	'lte',
	'not',
	'contains',
	'excludes',
	'any',
	'none',
	'range',
])

export const fromOperation = z.object({
	from: z.number(),
	inclusive: z.boolean().optional(),
	to: z.number(),
})

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
	'cover_artists',
	'links',
	'characters',
	'teams',
])

// const numberFields = z.enum(['age_rating', 'year', 'pages', 'page_count'])

export const filter = z
	.object({
		field: z.string(),
		operation,
		source: z.enum(['book', 'book_meta', 'series', 'library']),
		value: z.union([z.string(), z.string().array(), z.number(), z.number().array(), fromOperation]),
	})
	// strings may not use gt, gte, lt, lte, from
	.refine(
		(input) =>
			!(
				stringField.safeParse(input.field).success &&
				['gt', 'gte', 'lt', 'lte', 'from'].includes(input.operation)
			),
		{
			message: 'String fields may not use gt, gte, lt, lte, from',
		},
	)
export type FilterSchema = z.infer<typeof filter>

export const intoAPIFilter = (input: z.infer<typeof filter>): MediaSmartFilter => {
	const fieldValue = match(input.operation)
		.with('range', () => input.value)
		.otherwise(() => ({ [input.operation]: input.value }))

	const converted = match(input.source)
		.with(
			'book',
			() =>
				({
					[input.field]: fieldValue,
				}) as MediaSmartFilter,
		)
		.with('book_meta', () => ({
			metadata: {
				[input.field]: fieldValue,
			} as MediaMetadataSmartFilter,
		}))
		.with('series', () => ({
			series: {
				[input.field]: fieldValue,
			} as SeriesSmartFilter,
		}))
		.with('library', () => ({
			series: {
				library: {
					[input.field]: fieldValue,
				},
			} as SeriesSmartFilter,
		}))
		.exhaustive()

	return converted
}

// FIXME: this is SUPER unsafe wrt the types...
export const intoFormFilter = (input: MediaSmartFilter): z.infer<typeof filter> => {
	const source = match(input)
		.when(
			(x) => 'metadata' in x,
			() => 'book_meta' as const,
		)
		.when(
			(x) => 'series' in x && 'library' in x.series,
			() => 'library' as const,
		)
		.when(
			(x) => 'series' in x,
			() => 'series' as const,
		)
		.otherwise(() => 'book' as const)

	const field = match(source)
		.with('book', () => Object.keys(input)[0])
		.with(
			'book_meta',
			() => Object.keys((input as { metadata: MediaMetadataSmartFilter }).metadata)[0],
		)
		.with('series', () => Object.keys((input as { series: SeriesSmartFilter }).series)[0])
		.with(
			'library',
			() => Object.keys((input as { series: { library: LibrarySmartFilter } }).series.library)[0],
		)
		.exhaustive()

	const conversion = match(source)
		.with('book', () => {
			const castedInput = input as MediaSmartFilter
			const filterValue = getProperty(castedInput, field || '') // { [operation]: value }
			const operation = 'from' in filterValue ? 'range' : Object.keys(filterValue || {})[0]
			const value = match(operation)
				.with('range', () => filterValue)
				.otherwise(() => getProperty(filterValue, operation || ''))

			return {
				field,
				operation,
				source,
				value,
			}
		})
		.with('book_meta', () => {
			const castedInput = input as { metadata: MediaMetadataSmartFilter } // { metadata: { [field]: { [operation]: value } } }
			const filterValue = getProperty(castedInput.metadata, field || '') // { [operation]: value }
			const operation = 'from' in filterValue ? 'range' : Object.keys(filterValue || {})[0]
			const value = match(operation)
				.with('range', () => filterValue)
				.otherwise(() => getProperty(filterValue, operation || ''))

			return {
				field,
				operation,
				source,
				value,
			}
		})
		.with('series', () => {
			const castedInput = input as { series: SeriesSmartFilter } // { series: { [field]: { [operation]: value } } }
			const filterValue = getProperty(castedInput.series, field || '')
			const operation = 'from' in filterValue ? 'range' : Object.keys(filterValue || {})[0]
			const value = match(operation)
				.with('range', () => filterValue)
				.otherwise(() => getProperty(filterValue, operation || ''))

			return {
				field,
				operation,
				source,
				value,
			}
		})
		.with('library', () => {
			const castedInput = input as { series: { library: LibrarySmartFilter } } // { series: { library: { [field]: { [operation]: value } } } }
			const filterValue = getProperty(castedInput.series.library, field || '') // { [operation]: value }
			const operation = 'from' in filterValue ? 'range' : Object.keys(filterValue || {})[0]
			const value = operation === 'range' ? filterValue : getProperty(filterValue, operation || '')
			return {
				field,
				operation,
				source,
				value,
			}
		})
		.exhaustive()

	return conversion as unknown as z.infer<typeof filter>
}

export const filterGroup = z.object({
	filters: z.array(filter),
	joiner: z.enum(['and', 'or', 'not']),
})

export const filterConfig = z.object({
	groups: z.array(filterGroup),
	joiner: z.enum(['and', 'or', 'not']),
})

export const schema = z.object({
	description: z.string().optional(),
	filters: filterConfig,
	name: z.string().min(1),
	visibility: z.enum(['PRIVATE', 'PUBLIC', 'SHARED']),
})
