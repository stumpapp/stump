import { MediaMetadataEditorFragment } from '@stump/graphql'
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
	identifierAmazon: nonEmptyString.nullish(),
	identifierCalibre: nonEmptyString.nullish(),
	identifierGoogle: nonEmptyString.nullish(),
	identifierIsbn: nonEmptyString.nullish(),
	identifierMobiAsin: nonEmptyString.nullish(),
	identifierUuid: nonEmptyString.nullish(),
	genres: stringArray.nullish(),
	inkers: stringArray.nullish(),
	language: nonEmptyString.nullish(),
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
	titleSort: nonEmptyString.nullish(),
	volume: z.number().min(1).nullish(),
	writers: stringArray.nullish(),
	year: z.number().min(1900).max(new Date().getFullYear()).nullish(),
})

export type MetadataEditorValues = z.infer<typeof schema>

export const getEditorDefaultValues = (
	data?: MediaMetadataEditorFragment | null,
): MetadataEditorValues => {
	if (!data) {
		return {
			ageRating: null,
			characters: null,
			colorists: null,
			coverArtists: null,
			day: null,
			editors: null,
			identifierAmazon: null,
			identifierCalibre: null,
			identifierGoogle: null,
			identifierIsbn: null,
			identifierMobiAsin: null,
			identifierUuid: null,
			genres: null,
			inkers: null,
			language: null,
			letterers: null,
			links: null,
			month: null,
			number: null,
			notes: null,
			pageCount: null,
			pencillers: null,
			publisher: null,
			series: null,
			summary: null,
			teams: null,
			title: null,
			titleSort: null,
			volume: null,
			writers: null,
			year: null,
		}
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
			identifierAmazon: data.identifierAmazon,
			identifierCalibre: data.identifierCalibre,
			identifierGoogle: data.identifierGoogle,
			identifierIsbn: data.identifierIsbn,
			identifierMobiAsin: data.identifierMobiAsin,
			identifierUuid: data.identifierUuid,
			genres: data.genres,
			inkers: data.inkers,
			language: data.language,
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
			titleSort: data.titleSort,
			volume: data.volume,
			writers: data.writers,
			year: data.year,
		}
	}
	return result.data
}
