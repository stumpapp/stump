import { SeriesMetadataEditorFragment } from '@stump/graphql'
import { z } from 'zod'

const stringArray = z.array(z.string().min(1))

export const VALID_SERIES_STATUS = [
	'Abandoned',
	'Ongoing',
	'Completed',
	'Cancelled',
	'Hiatus',
] as const
export const seriesStatus = z.enum(VALID_SERIES_STATUS)
export type SeriesStatus = z.infer<typeof seriesStatus>

export const isSeriesStatus = (value: unknown): value is SeriesStatus => {
	return seriesStatus.safeParse(value).success
}

export const schema = z
	.object({
		ageRating: z.number().min(0).nullish(),
		booktype: z.string().nullish(),
		characters: stringArray.nullish(),
		comicid: z.number().nullish(),
		genres: stringArray.nullish(),
		imprint: z.string().nullish(),
		links: z.array(z.string().url()).nullish(),
		metaType: z.string().nullish(),
		publisher: z.string().nullish(),
		status: z.string().nullish(),
		summary: z.string().nullish(),
		title: z.string().nullish(),
		volume: z.number().min(1).nullish(),
		writers: stringArray.nullish(),
	})
	.transform((values) => {
		const transformed = { ...values }

		for (const [key, value] of Object.entries(transformed)) {
			if (typeof value === 'string' && value.trim() === '') {
				transformed[key as keyof typeof transformed] = null as never
			}
		}

		return transformed
	})

export type SeriesMetadataEditorValues = z.infer<typeof schema>

export const getEditorDefaultValues = (
	data?: SeriesMetadataEditorFragment | null,
): SeriesMetadataEditorValues => {
	if (!data) {
		return {
			ageRating: null,
			booktype: null,
			characters: null,
			comicid: null,
			genres: null,
			imprint: null,
			links: null,
			metaType: null,
			publisher: null,
			status: null,
			summary: null,
			title: null,
			volume: null,
			writers: null,
		}
	}

	const result = schema.safeParse(data)
	if (!result.success) {
		console.warn('Failed to parse form from actual metadata', result.error)
		return {
			ageRating: data.ageRating,
			booktype: data.booktype,
			characters: data.characters,
			comicid: data.comicid,
			genres: data.genres,
			imprint: data.imprint,
			links: data.links,
			metaType: data.metaType,
			publisher: data.publisher,
			status: data.status,
			summary: data.summary,
			title: data.title,
			volume: data.volume,
			writers: data.writers,
		}
	}
	return result.data
}
