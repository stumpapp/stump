import {
	CreateOrUpdateSmartList,
	FilterGroup,
	LibrarySmartFilter,
	MediaMetadataSmartFilter,
	MediaSmartFilter,
	SeriesSmartFilter,
	SmartFilter,
	SmartList,
} from '@stump/sdk'
import getProperty from 'lodash/get'
import { match, P } from 'ts-pattern'
import { z } from 'zod'

export const stringOperation = z.enum(['contains', 'excludes', 'not', 'equals'])
export type StringOperation = z.infer<typeof stringOperation>

export const listOperation = z.enum(['any', 'none'])
export type ListOperation = z.infer<typeof listOperation>
export const isListOperator = (value: string): value is ListOperation =>
	listOperation.safeParse(value).success

export const numberOperation = z.enum(['gt', 'gte', 'lt', 'lte', 'not', 'equals', 'range'])
export type NumberOperation = z.infer<typeof numberOperation>
export const isNumberOperator = (value: string): value is NumberOperation =>
	numberOperation.safeParse(value).success

export const operation = z.union([stringOperation, listOperation, numberOperation])
export type Operation = z.infer<typeof operation>

export const fromOperation = z.object({
	from: z.union([z.date(), z.number()]),
	inclusive: z.boolean().optional(),
	to: z.union([z.date(), z.number()]),
})
export type FromOperation = z.infer<typeof fromOperation>

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
export type StringField = z.infer<typeof stringField>
export const isStringField = (field: string): field is StringField =>
	stringField.safeParse(field).success

export const numberField = z.enum([
	'age_rating',
	'year',
	'day',
	'month',
	'pages',
	'page_count',
	'size',
])
export type NumberField = z.infer<typeof numberField>
export const isNumberField = (field: string): field is NumberField =>
	numberField.safeParse(field).success

export const dateField = z.enum(['created_at', 'updated_at', 'completed_at'])
export type DateField = z.infer<typeof dateField>
export const isDateField = (field: string): field is DateField => dateField.safeParse(field).success

export const filter = z
	.object({
		field: z.string(),
		operation,
		source: z.enum(['book', 'book_meta', 'series', 'library']),
		value: z.union([
			z.string(),
			z.string().array(),
			z.number(),
			z.number().array(),
			z.date(),
			fromOperation,
		]),
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
export type FilterSource = FilterSchema['source']

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
export type FilterGroupSchema = z.infer<typeof filterGroup>
export type FilterGroupJoiner = FilterGroupSchema['joiner']

export const intoFormGroup = (
	input: FilterGroup<MediaSmartFilter>,
): z.infer<typeof filterGroup> => {
	const converted = match(input)
		.with(
			{ and: P.array() },
			({ and }) =>
				({
					filters: and.map(intoFormFilter),
					joiner: 'and',
				}) satisfies z.infer<typeof filterGroup>,
		)
		.with(
			{ or: P.array() },
			({ or }) =>
				({ filters: or.map(intoFormFilter), joiner: 'or' }) satisfies z.infer<typeof filterGroup>,
		)
		.with(
			{ not: P.array() },
			({ not }) =>
				({ filters: not.map(intoFormFilter), joiner: 'not' }) satisfies z.infer<typeof filterGroup>,
		)
		.otherwise(
			() =>
				({
					filters: [],
					joiner: 'and',
				}) satisfies z.infer<typeof filterGroup>,
		)

	return converted
}

export const intoAPIGroup = (input: z.infer<typeof filterGroup>): FilterGroup<MediaSmartFilter> => {
	const converted = match(input)
		.with(
			{ filters: P.array(), joiner: 'and' },
			({ filters }) => ({ and: filters.map(intoAPIFilter) }) as FilterGroup<MediaSmartFilter>,
		)
		.with(
			{ filters: P.array(), joiner: 'or' },
			({ filters }) => ({ or: filters.map(intoAPIFilter) }) as FilterGroup<MediaSmartFilter>,
		)
		.with(
			{ filters: P.array(), joiner: 'not' },
			({ filters }) => ({ not: filters.map(intoAPIFilter) }) as FilterGroup<MediaSmartFilter>,
		)
		.otherwise(() => ({ and: [] }) as FilterGroup<MediaSmartFilter>)

	return converted
}

export const filterConfig = z.object({
	groups: z.array(filterGroup),
	joiner: z.enum(['and', 'or']),
})

export const grouping = z.enum(['BY_BOOKS', 'BY_SERIES', 'BY_LIBRARY'])
export type SmartListGroupBy = z.infer<typeof grouping>
export const isGrouping = (value: string): value is SmartListGroupBy =>
	grouping.safeParse(value).success

export const createSchema = (
	existingNames: string[],
	t: (key: string) => string,
	updatingList?: SmartList,
) => {
	const forbiddenNames = existingNames.filter((name) => name !== updatingList?.name)
	return z.object({
		description: z.string().optional(),
		filters: filterConfig,
		grouping: grouping.optional(),
		name: z
			.string()
			.min(1, t(validationKey('nameTooShort')))
			.refine((name) => !forbiddenNames.includes(name), { message: t(validationKey('nameTaken')) }),
		visibility: z.enum(['PRIVATE', 'PUBLIC', 'SHARED']),
	})
}
const validationKey = (key: string) => `createOrUpdateSmartListForm.validation.${key}`

export type SmartListFormSchema = z.infer<ReturnType<typeof createSchema>>

export const intoForm = ({
	name,
	description,
	visibility,
	filters,
	joiner,
	default_grouping,
}: Omit<SmartList, 'saved_views'>): SmartListFormSchema => ({
	description: description || undefined,
	filters: {
		groups: filters.groups.map(intoFormGroup),
		joiner: joiner.toLowerCase() as 'and' | 'or',
	},
	grouping: default_grouping || undefined,
	name,
	visibility,
})

export const intoAPI = ({
	name,
	description,
	visibility,
	filters: { groups, joiner },
	grouping,
}: SmartListFormSchema): CreateOrUpdateSmartList => ({
	default_grouping: grouping || null,
	description: description || null,
	filters: {
		groups: groups.map(intoAPIGroup),
	},
	joiner: joiner.toUpperCase() as 'AND' | 'OR',
	name,
	visibility,
})

export const intoAPIFilters = ({
	groups,
	joiner,
}: Pick<SmartListFormSchema, 'filters'>['filters']): SmartFilter<MediaSmartFilter> => ({
	groups: groups.map(intoAPIGroup),
	joiner: joiner.toUpperCase() as 'AND' | 'OR',
})
