import { MetadataField } from '@stump/graphql'

export type FieldEditorType = 'text' | 'number' | 'badgeList' | 'longText'
export type NumberValidation = { min?: number; max?: number }

export type FieldValidation = NumberValidation

const CURRENT_YEAR = new Date().getFullYear()

export type MetadataFieldDef = {
	field: MetadataField
	binding: string
	candidateKey?: string // for matching external metadata
	editorType?: FieldEditorType
	validation?: FieldValidation
}

export const MEDIA_FIELD_DEFS: MetadataFieldDef[] = [
	{ field: MetadataField.Title, binding: 'title', candidateKey: 'title', editorType: 'text' },
	{
		field: MetadataField.Summary,
		binding: 'summary',
		candidateKey: 'summary',
		editorType: 'longText',
	},
	{
		field: MetadataField.Genres,
		binding: 'genres',
		candidateKey: 'genres',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.Writers,
		binding: 'writers',
		candidateKey: 'writers',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.Colorists,
		binding: 'colorists',
		candidateKey: 'colorists',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.Letterers,
		binding: 'letterers',
		candidateKey: 'letterers',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.CoverArtists,
		binding: 'coverArtists',
		candidateKey: 'coverArtists',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.Year,
		binding: 'year',
		candidateKey: 'year',
		editorType: 'number',
		validation: { min: 1900, max: CURRENT_YEAR },
	},
	{
		field: MetadataField.PageCount,
		binding: 'pageCount',
		candidateKey: 'pageCount',
		editorType: 'number',
		validation: { min: 1 },
	},
	{
		field: MetadataField.Isbn,
		binding: 'identifierIsbn',
		candidateKey: 'isbn',
		editorType: 'text',
	},
	{ field: MetadataField.Format, binding: 'format' },
	{ field: MetadataField.TitleSort, binding: 'titleSort' },
	{ field: MetadataField.ReleaseDate, binding: 'day', validation: { min: 1, max: 31 } },
	{ field: MetadataField.ReleaseDate, binding: 'month', validation: { min: 1, max: 12 } },
	{ field: MetadataField.Number, binding: 'number' },
	{ field: MetadataField.VolumeCount, binding: 'volume', validation: { min: 1 } },
	{ field: MetadataField.Series, binding: 'series' },
	{ field: MetadataField.SeriesGroup, binding: 'seriesGroup' },
	{ field: MetadataField.StoryArc, binding: 'storyArc' },
	{ field: MetadataField.StoryArcNumber, binding: 'storyArcNumber' },
	{ field: MetadataField.Publisher, binding: 'publisher' },
	{ field: MetadataField.AgeRating, binding: 'ageRating', validation: { min: 0 } },
	{ field: MetadataField.Editors, binding: 'editors' },
	{ field: MetadataField.Pencillers, binding: 'pencillers' },
	{ field: MetadataField.Inkers, binding: 'inkers' },
	{ field: MetadataField.Characters, binding: 'characters' },
	{ field: MetadataField.Language, binding: 'language' },
	{ field: MetadataField.Links, binding: 'links' },
	{ field: MetadataField.Notes, binding: 'notes' },
	{ field: MetadataField.Teams, binding: 'teams' },
	{ field: MetadataField.IdentifierAmazon, binding: 'identifierAmazon' },
	{ field: MetadataField.IdentifierCalibre, binding: 'identifierCalibre' },
	{ field: MetadataField.IdentifierGoogle, binding: 'identifierGoogle' },
	{ field: MetadataField.IdentifierMobiAsin, binding: 'identifierMobiAsin' },
	{ field: MetadataField.IdentifierUuid, binding: 'identifierUuid' },
]

export const SERIES_FIELD_DEFS: MetadataFieldDef[] = [
	{ field: MetadataField.Title, binding: 'title', candidateKey: 'seriesTitle', editorType: 'text' },
	{
		field: MetadataField.Summary,
		binding: 'summary',
		candidateKey: 'summary',
		editorType: 'longText',
	},
	{
		field: MetadataField.Genres,
		binding: 'genres',
		candidateKey: 'genres',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.Writers,
		binding: 'writers',
		candidateKey: 'authors',
		editorType: 'badgeList',
	},
	{
		field: MetadataField.Publisher,
		binding: 'publisher',
		candidateKey: 'publisher',
		editorType: 'text',
	},
	{
		field: MetadataField.Year,
		binding: 'year',
		candidateKey: 'year',
		editorType: 'number',
		validation: { min: 1900, max: CURRENT_YEAR },
	},
	{ field: MetadataField.Status, binding: 'status', candidateKey: 'status', editorType: 'text' },
	{
		field: MetadataField.AgeRating,
		binding: 'ageRating',
		candidateKey: 'ageRating',
		editorType: 'number',
		validation: { min: 0 },
	},
	{
		field: MetadataField.VolumeCount,
		binding: 'volume',
		candidateKey: 'volumeCount',
		editorType: 'number',
		validation: { min: 1 },
	},
	{ field: MetadataField.ComicId, binding: 'comicid' },
	{ field: MetadataField.VolumeCount, binding: 'totalIssues' },
	{ field: MetadataField.BookType, binding: 'booktype' },
	{ field: MetadataField.Characters, binding: 'characters' },
	{ field: MetadataField.Imprint, binding: 'imprint' },
	{ field: MetadataField.Links, binding: 'links' },
	{ field: MetadataField.MetaType, binding: 'metaType' },
	{ field: MetadataField.PublicationRun, binding: 'publicationRun' },
	{ field: MetadataField.ComicImage, binding: 'comicImage' },
	{ field: MetadataField.DescriptionFormatted, binding: 'descriptionFormatted' },
]

const ALL_FIELD_DEFS = [...SERIES_FIELD_DEFS, ...MEDIA_FIELD_DEFS]

export const BINDING_TO_METADATA_FIELD: Record<string, MetadataField> = Object.fromEntries(
	ALL_FIELD_DEFS.map((d) => [d.binding, d.field]),
)

export const FIELD_EDITOR_MAP: Partial<Record<MetadataField, FieldEditorType>> = Object.fromEntries(
	ALL_FIELD_DEFS.filter((d) => d.editorType != null).map((d) => [d.field, d.editorType]),
)

const BINDING_VALIDATION: Record<string, NumberValidation> = Object.fromEntries(
	ALL_FIELD_DEFS.filter(
		(d): d is MetadataFieldDef & { validation: NumberValidation } => d.validation != null,
	).map((d) => [d.binding, d.validation]),
)

export const getBindingValidation = (binding: string): FieldValidation | undefined =>
	BINDING_VALIDATION[binding]

const FIELD_VALIDATION: Partial<Record<MetadataField, NumberValidation>> = Object.fromEntries(
	ALL_FIELD_DEFS.filter(
		(d): d is MetadataFieldDef & { validation: NumberValidation } => d.validation != null,
	).map((d) => [d.field, d.validation]),
)

export const getNumberValidation = (field: MetadataField): NumberValidation | undefined =>
	FIELD_VALIDATION[field]

export const FIELD_BINDING_NAME: Partial<Record<MetadataField, string>> = Object.fromEntries(
	ALL_FIELD_DEFS.filter((d) => d.editorType === 'badgeList').map((d) => [d.field, d.binding]),
)

export function isArrayField(field: MetadataField): boolean {
	return FIELD_EDITOR_MAP[field] === 'badgeList'
}

export type FieldComparison = {
	field: MetadataField
	binding: string
	currentValue: unknown
	candidateValue: unknown
}

// Note: We don't just return all fields since external metadata is a subset of internal, and I don't
// think it makes sense to show fields which are never going to be present in a matching decision
export function getMediaFieldComparisons(
	currentMetadata: Record<string, unknown> | null | undefined,
	candidateMetadata: Record<string, unknown>,
): FieldComparison[] {
	const current = currentMetadata ?? {}
	return MEDIA_FIELD_DEFS.filter((d) => d.candidateKey != null).map((d) => ({
		field: d.field,
		binding: d.binding,
		currentValue: current[d.binding] ?? null,
		candidateValue: candidateMetadata[d.candidateKey!] ?? null,
	}))
}

export function getSeriesFieldComparisons(
	currentMetadata: Record<string, unknown> | null | undefined,
	candidateMetadata: Record<string, unknown>,
): FieldComparison[] {
	const current = currentMetadata ?? {}
	return SERIES_FIELD_DEFS.filter((d) => d.candidateKey != null).map((d) => ({
		field: d.field,
		binding: d.binding,
		currentValue: current[d.binding] ?? null,
		candidateValue: candidateMetadata[d.candidateKey!] ?? null,
	}))
}
