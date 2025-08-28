import { SeriesMetadataEditorFragment } from '@stump/graphql'
import { z } from 'zod'

const nonEmptyString = z.string().min(1)

export const schema = z.object({
	ageRating: z.number().min(0).nullish(),
	booktype: nonEmptyString.nullish(),
	comicid: z.number().nullish(),
	imprint: nonEmptyString.nullish(),
	metaType: nonEmptyString.nullish(),
	publisher: z.string().nullish(),
	status: nonEmptyString.nullish(),
	summary: nonEmptyString.nullish(),
	title: nonEmptyString.nullish(),
	volume: z.number().min(1).nullish(),
})

export type SeriesMetadataEditorValues = z.infer<typeof schema>

export const getEditorDefaultValues = (
	data?: SeriesMetadataEditorFragment | null,
): SeriesMetadataEditorValues => {
	if (!data) {
		return {
			ageRating: null,
			booktype: null,
			comicid: null,
			imprint: null,
			metaType: null,
			publisher: null,
			status: null,
			summary: null,
			title: null,
			volume: null,
		}
	}

	const result = schema.safeParse(data)
	if (!result.success) {
		console.warn('Failed to parse form from actual metadata', result.error)
		return {
			ageRating: data.ageRating,
			booktype: data.booktype,
			comicid: data.comicid,
			imprint: data.imprint,
			metaType: data.metaType,
			publisher: data.publisher,
			status: data.status,
			summary: data.summary,
			title: data.title,
			volume: data.volume,
		}
	}
	return result.data
}
