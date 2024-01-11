// export type NumericFilter<T> = { gt: T } | { gte: T } | { lt: T } | { lte: T } | NumericRange<T>

import { MediaSmartFilter, SmartFilter } from '@stump/types'
import { match, P } from 'ts-pattern'
import { z } from 'zod'

// TODO: support friendly names for filter groups

// export type NumericRange<T> = { from: T; to: T; inclusive?: boolean }
export const numericFilterSchema = z.union([
	z.object({
		gt: z.number(),
	}),
	z.object({
		gte: z.number(),
	}),
	z.object({
		lt: z.number(),
	}),
	z.object({
		lte: z.number(),
	}),
	z.object({
		from: z.number(),
		inclusive: z.boolean().optional(),
		to: z.number(),
	}),
])

// export type Filter<T> = T | { not: T } | { contains: T } | { excludes: T } | { any: T[] } | { none: T[] } | NumericFilter<T>
export const buildFilterSchema = <T extends z.ZodTypeAny>(type: T) =>
	z.union([
		type,
		z.object({
			not: type,
		}),
		z.object({
			contains: type,
		}),
		z.object({
			excludes: type,
		}),
		z.object({
			any: z.array(type),
		}),
		z.object({
			none: z.array(type),
		}),
		...(type._def.typeName === 'number' ? [numericFilterSchema] : []),
	])

export const stringFilter = buildFilterSchema(z.string())

// export type MediaSmartFilter = { name: Filter<string> } | { metadata: MediaMetadataSmartFilter } | { series: SeriesSmartFilter }

// export type LibrarySmartFilter = { name: Filter<string> } | { path: Filter<string> }
export const libraryFilter = z.union([
	z.object({
		name: stringFilter,
	}),
	z.object({
		path: stringFilter,
	}),
])

// export type SeriesSmartFilter = { name: Filter<string> } | { library: LibrarySmartFilter }
export const seriesFilter = z.union([
	z.object({
		name: stringFilter,
	}),
	z.object({
		library: libraryFilter,
	}),
])

// export type MediaMetadataSmartFilter = { publisher: Filter<string> } | { genre: Filter<string> } | { character: Filter<string> } | { colorist: Filter<string> } | { writer: Filter<string> } | { penciller: Filter<string> } | { letterer: Filter<string> } | { inker: Filter<string> } | { editor: Filter<string> } | { age_rating: Filter<number> }
export const mediaMetadataFilter = z.union([
	z.object({
		publisher: stringFilter,
	}),
	z.object({
		genre: stringFilter,
	}),
	z.object({
		character: stringFilter,
	}),
	z.object({
		colorist: stringFilter,
	}),
	z.object({
		writer: stringFilter,
	}),
	z.object({
		penciller: stringFilter,
	}),
	z.object({
		letterer: stringFilter,
	}),
	z.object({
		inker: stringFilter,
	}),
	z.object({
		editor: stringFilter,
	}),
	z.object({
		age_rating: numericFilterSchema,
	}),
])

// export type MediaSmartFilter = { name: Filter<string> } | { metadata: MediaMetadataSmartFilter } | { series: SeriesSmartFilter }
export const mediaFilter = z.union([
	z.object({
		name: stringFilter,
	}),
	z.object({
		metadata: mediaMetadataFilter,
	}),
	z.object({
		series: seriesFilter,
	}),
])
export type MediaFilterSchema = z.infer<typeof mediaFilter>

export const defaultMediaFilter = mediaFilter.parse({
	name: '',
})

// export type FilterGroup<T> = { and: T[] } | { or: T[] } | { not: T[] }
export const filterGroup = z.object({
	filters: z.array(mediaFilter),
	joiner: z.union([z.literal('and'), z.literal('or'), z.literal('not')]),
})
export type FilterGroupSchema = z.infer<typeof filterGroup>

// export type SmartFilter<T> = { groups: FilterGroup<T>[]; joiner?: FilterJoin }
export const filters = z.object({
	groups: z.array(filterGroup),
	joiner: z.union([z.literal('AND'), z.literal('OR')]),
})

export const schema = z.object({
	description: z.string().optional(),
	filters: filters,
	name: z.string().min(1),
	visibility: z.union([z.literal('PUBLIC'), z.literal('SHARED'), z.literal('PRIVATE')]),
})

export type Schema = z.infer<typeof schema>

// yikes
export const toAPIFilters = ({
	joiner,
	groups,
}: Schema['filters']): SmartFilter<MediaSmartFilter> => ({
	groups: groups.flatMap(({ filters, joiner }) => {
		return {
			[joiner]: filters,
		} as Record<'and' | 'or' | 'not', MediaSmartFilter[]>
	}),
	joiner,
})

// yikes
export const fromAPIFilters = ({
	groups,
	joiner,
}: SmartFilter<MediaSmartFilter>): Schema['filters'] => {
	return {
		groups: groups.map(
			(group) =>
				match(group)
					.with({ and: P.array() }, ({ and }) => ({ filters: and, joiner: 'and' }))
					.with({ or: P.array() }, ({ or }) => ({ filters: or, joiner: 'or' }))
					.with({ not: P.array() }, ({ not }) => ({ filters: not, joiner: 'not' }))
					.otherwise(() => ({ filters: [], joiner: 'and' })) as {
					filters: z.infer<typeof filters>['groups'][number]['filters']
					joiner: 'and' | 'or' | 'not'
				},
		),

		joiner: joiner ?? 'AND',
	}
}
