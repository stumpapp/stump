import { SeriesMetadataEditorFragment } from '@stump/graphql'
import { z } from 'zod'

const nonEmptyString = z.string().min(1)
const stringArray = z.array(nonEmptyString)

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

export const schema = z.object({
	ageRating: z.number().min(0).nullish(),
	booktype: nonEmptyString.nullish(),
	characters: stringArray.nullish(),
	comicid: z.number().nullish(),
	genres: stringArray.nullish(),
	imprint: nonEmptyString.nullish(),
	links: z.array(z.string().url()).nullish(),
	metaType: nonEmptyString.nullish(),
	publisher: z.string().nullish(),
	status: nonEmptyString.nullish(),
	summary: nonEmptyString.nullish(),
	title: nonEmptyString.nullish(),
	volume: z.number().min(1).nullish(),
	writers: stringArray.nullish(),
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
