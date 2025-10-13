import { MediaMetadataEditorFragment } from '@stump/graphql'
import { z } from 'zod'

const stringArray = z.array(z.string().min(1))

export const schema = z
	.object({
		ageRating: z.number().min(0).nullish(),
		characters: stringArray.nullish(),
		colorists: stringArray.nullish(),
		coverArtists: stringArray.nullish(),
		day: z.number().min(1).max(31).nullish(),
		editors: stringArray.nullish(),
		format: z.string().nullish(),
		identifierAmazon: z.string().nullish(),
		identifierCalibre: z.string().nullish(),
		identifierGoogle: z.string().nullish(),
		identifierIsbn: z.string().nullish(),
		identifierMobiAsin: z.string().nullish(),
		identifierUuid: z.string().nullish(),
		genres: stringArray.nullish(),
		inkers: stringArray.nullish(),
		language: z.string().nullish(),
		letterers: stringArray.nullish(),
		links: z.array(z.string().url()).nullish(),
		month: z.number().min(1).max(12).nullish(),
		number: z.number({ coerce: true }).nullish(),
		notes: z.string().nullish(),
		pageCount: z.number().min(1).nullish(),
		pencillers: stringArray.nullish(),
		publisher: z.string().nullish(),
		series: z.string().nullish(),
		seriesGroup: z.string().nullish(),
		storyArc: z.string().nullish(),
		storyArcNumber: z.number({ coerce: true }).nullish(),
		summary: z.string().nullish(),
		teams: stringArray.nullish(),
		title: z.string().nullish(),
		titleSort: z.string().nullish(),
		volume: z.number().min(1).nullish(),
		writers: stringArray.nullish(),
		year: z.number().min(1900).max(new Date().getFullYear()).nullish(),
	})
	.transform((values) => {
		const transformed = { ...values }

		for (const [key, value] of Object.entries(transformed)) {
			if (typeof value === 'string' && value.trim() === '') {
				transformed[key as keyof typeof transformed] = null
			} else if (typeof value === 'number' && isNaN(value)) {
				transformed[key as keyof typeof transformed] = null
			}
		}

		return transformed
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
			format: null,
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
			seriesGroup: null,
			storyArc: null,
			storyArcNumber: null,
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
			format: data.format,
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
			seriesGroup: data.seriesGroup,
			storyArc: data.storyArc,
			storyArcNumber: data.storyArcNumber,
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
