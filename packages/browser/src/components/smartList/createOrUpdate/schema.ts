import {
	EntityVisibility,
	LibraryFilterInput,
	MediaFilterInput,
	MediaMetadataFilterInput,
	SaveSmartListInput,
	SeriesFilterInput,
	SeriesMetadataFilterInput,
	SmartListFilterGroupInput,
	SmartListFilterInput,
	SmartListGrouping,
	SmartListGroupJoiner,
	SmartListJoiner,
} from '@stump/graphql'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { SmartListParsed } from '@/scenes/smartList/graphql'

export const stringOperation = z.enum(['contains', 'excludes', 'neq', 'eq'])
export type StringOperation = z.infer<typeof stringOperation>

export const listOperation = z.enum(['anyOf', 'noneOf'])
export type ListOperation = z.infer<typeof listOperation>
export const isListOperator = (value: string): value is ListOperation =>
	listOperation.safeParse(value).success

export const numberOperation = z.enum(['gt', 'gte', 'lt', 'lte', 'neq', 'eq', 'range'])
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
	'genres',
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
		id: z.string().optional(),
		field: z.string(),
		operation,
		source: z.enum(['book', 'book_meta', 'series', 'series_meta', 'library']),
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

// FIXME: this is SUPER unsafe wrt the types...
export const intoFormFilter = (input: SmartListFilterInput): z.infer<typeof filter> => {
	const source = match(input)
		.when(
			(x) => 'media' in x,
			() => 'book' as const,
		)
		.when(
			(x) => 'mediaMetadata' in x,
			() => 'book_meta' as const,
		)
		.when(
			(x) => 'series' in x,
			() => 'series' as const,
		)
		.when(
			(x) => 'seriesMetadata' in x,
			() => 'series_meta' as const,
		)
		.when(
			(x) => 'library' in x,
			() => 'library' as const,
		)
		.otherwise(() => 'book' as const)
	const filterObj = match(source)
		.with('book', () => input.media || {})
		.with('book_meta', () => input.mediaMetadata || {})
		.with('series', () => input.series || {})
		.with('series_meta', () => input.seriesMetadata || {})
		.with('library', () => input.library || {})
		.exhaustive()

	const field = Object.keys(filterObj)[0] || ''

	// TODO: Add support for this since it is WAY more efficient!
	if (['_and', '_or', '_not'].includes(field)) {
		throw new Error('Logical operators are not supported as individual filters')
	}

	const filterValue = Object.entries(filterObj)[0]?.[1]

	if (!filterValue) {
		throw new Error('Filter value is undefined or empty')
	}

	const entry = Object.entries(filterValue)[0]
	if (!entry) {
		throw new Error('Input filter is empty or malformed')
	}

	const operation = entry[0]
	const value = entry[1]

	// TODO: generate a UUID instead?
	const rand = Math.random().toString(36).substring(2, 15)
	const id = `${source}-${field}-${operation}-${rand}`

	const conversion = {
		id,
		field,
		operation,
		source,
		value,
	}

	return conversion as unknown as z.infer<typeof filter>
}

export const filterGroup = z.object({
	filters: z.array(filter),
	joiner: z.enum(['and', 'or', 'not']),
})
export type FilterGroupSchema = z.infer<typeof filterGroup>
export type FilterGroupJoiner = FilterGroupSchema['joiner']

export const intoFormGroup = (input: SmartListFilterGroupInput): z.infer<typeof filterGroup> => {
	return {
		filters: input.groups.map(intoFormFilter),
		joiner: input.joiner.toLowerCase() as 'and' | 'or' | 'not',
	}
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
	updatingList?: SmartListParsed,
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
	defaultGrouping,
}: Omit<SmartListParsed, 'views' | 'creatorId' | 'thumbnail'>): SmartListFormSchema => {
	return {
		description: description || undefined,
		filters: {
			groups: filters.map(intoFormGroup),
			joiner: joiner.toLowerCase() as 'and' | 'or',
		},
		grouping: defaultGrouping || undefined,
		name,
		visibility,
	}
}

export const intoAPIFilters = ({
	groups,
}: Pick<SmartListFormSchema, 'filters'>['filters']): Array<SmartListFilterGroupInput> =>
	groups.map(intoAPIGroup)

export const intoAPIFilter = (input: z.infer<typeof filter>): SmartListFilterInput => {
	const fieldValue = match(input.operation).otherwise(() => ({ [input.operation]: input.value }))

	return match(input.source)
		.with(
			'book',
			() =>
				({
					media: {
						[input.field]: fieldValue,
					} as MediaFilterInput,
				}) as SmartListFilterInput,
		)
		.with(
			'book_meta',
			() =>
				({
					mediaMetadata: {
						[input.field]: fieldValue,
					} as MediaMetadataFilterInput,
				}) as SmartListFilterInput,
		)
		.with(
			'series',
			() =>
				({
					series: {
						[input.field]: fieldValue,
					},
				}) as SeriesFilterInput as SmartListFilterInput,
		)
		.with(
			'series_meta',
			() =>
				({
					seriesMetadata: {
						[input.field]: fieldValue,
					} as SeriesMetadataFilterInput,
				}) as SmartListFilterInput,
		)
		.with(
			'library',
			() =>
				({
					library: {
						[input.field]: fieldValue,
					} as LibraryFilterInput,
				}) as SmartListFilterInput,
		)
		.exhaustive()
}

export const intoAPIGroup = (input: z.infer<typeof filterGroup>): SmartListFilterGroupInput => {
	return {
		groups: input.filters.map(intoAPIFilter),
		joiner: input.joiner.toUpperCase() as SmartListGroupJoiner,
	}
}

export const intoAPI = ({
	name,
	description,
	visibility,
	filters: { groups, joiner },
	grouping,
}: SmartListFormSchema): SaveSmartListInput => ({
	defaultGrouping: (grouping as SmartListGrouping) || SmartListGrouping.ByBooks,
	description: description || null,
	filters: groups.map(intoAPIGroup),
	joiner: joiner.toUpperCase() as SmartListJoiner,
	name,
	visibility: visibility as EntityVisibility,
})
