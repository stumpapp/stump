import {
	LibrarySmartFilter,
	MediaMetadataSmartFilter,
	MediaSmartFilter,
	SeriesSmartFilter,
} from '@stump/types'
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
	'from',
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
		value: z.union([z.string(), z.number(), fromOperation]),
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

export const intoAPIFilter = (input: z.infer<typeof filter>): MediaSmartFilter => {
	const converted = match(input.source)
		.with(
			'book',
			() =>
				({
					[input.field]: {
						[input.operation]: input.value,
					},
				}) as MediaSmartFilter,
		)
		.with('book_meta', () => ({
			metadata: {
				[input.field]: {
					[input.operation]: input.value,
				},
			} as MediaMetadataSmartFilter,
		}))
		.with('series', () => ({
			series: {
				[input.field]: {
					[input.operation]: input.value,
				},
			} as SeriesSmartFilter,
		}))
		.with('library', () => ({
			series: {
				library: {
					[input.field]: {
						[input.operation]: input.value,
					},
				},
			} as SeriesSmartFilter,
		}))
		.exhaustive()

	return converted
}

const intoFormFilter = (input: MediaSmartFilter) => {
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
