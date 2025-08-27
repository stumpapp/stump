import { MetadataEditorFragment } from '@stump/graphql'
import { z } from 'zod'

const nonEmptyString = z.string().min(1)
const stringArray = z.array(nonEmptyString)

export const schema = z.object({
	ageRating: z.number().min(0).nullish(),
	characters: stringArray.nullish(),
	colorists: stringArray.nullish(),
	coverArtists: stringArray.nullish(),
	day: z.number().min(1).max(31).nullish(),
	editors: stringArray.nullish(),
	genres: stringArray.nullish(),
	inkers: stringArray.nullish(),
	letterers: stringArray.nullish(),
	links: z.array(z.string().url()).nullish(),
	month: z.number().min(1).max(12).nullish(),
	number: z.number({ coerce: true }).nullish(),
	notes: nonEmptyString.nullish(),
	pageCount: z.number().min(1).nullish(),
	pencillers: stringArray.nullish(),
	publisher: z.string().nullish(),
	series: z.string().nullish(),
	summary: nonEmptyString.nullish(),
	teams: stringArray.nullish(),
	title: nonEmptyString.nullish(),
	volume: z.number().min(1).nullish(),
	writers: stringArray.nullish(),
	year: z.number().min(1900).max(new Date().getFullYear()).nullish(),
})

export type MetadataEditorValues = z.infer<typeof schema>

export const getEditorDefaultValues = (
	data?: MetadataEditorFragment | null,
): MetadataEditorValues => {
	if (!data) {
		return {}
	}

	const result = schema.safeParse(data)
	if (!result.success) {
		console.warn('Failed to parse form from actual metadata', result.error)
		return {
			ageRating: data.ageRating,
			characters: data.characters,
			colorists: data.colorists,
			coverArtists: data.coverArtists,
			day: data.day,
			editors: data.editors,
			genres: data.genres,
			inkers: data.inkers,
			letterers: data.letterers,
			links: data.links,
			month: data.month,
			number: data.number,
			notes: data.notes,
			pageCount: data.pageCount,
			pencillers: data.pencillers,
			publisher: data.publisher,
			series: data.series,
			summary: data.summary,
			teams: data.teams,
			title: data.title,
			volume: data.volume,
			writers: data.writers,
			year: data.year,
		}
	}
	return result.data
}
