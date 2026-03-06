import { MetadataField } from '@stump/graphql'

export type FieldEditorType = 'text' | 'number' | 'badgeList' | 'longText'

/**
 * Maps each MetadataField to the type of inline editor to render
 */
export const FIELD_EDITOR_MAP: Partial<Record<MetadataField, FieldEditorType>> = {
	[MetadataField.Title]: 'text',
	[MetadataField.Summary]: 'longText',
	[MetadataField.Genres]: 'badgeList',
	[MetadataField.Tags]: 'badgeList',
	[MetadataField.Authors]: 'badgeList',
	[MetadataField.Artists]: 'badgeList',
	[MetadataField.Writers]: 'badgeList',
	[MetadataField.Colorists]: 'badgeList',
	[MetadataField.Letterers]: 'badgeList',
	[MetadataField.CoverArtists]: 'badgeList',
	[MetadataField.Publisher]: 'text',
	[MetadataField.Year]: 'number',
	[MetadataField.AgeRating]: 'number',
	[MetadataField.Status]: 'text',
	[MetadataField.VolumeCount]: 'number',
	[MetadataField.PageCount]: 'number',
	[MetadataField.Isbn]: 'text',
}

/**
 * Maps MetadataField to the field name used for validation rules
 */
export const FIELD_VALIDATION_NAME: Partial<Record<MetadataField, string>> = {
	[MetadataField.Year]: 'year',
	[MetadataField.AgeRating]: 'ageRating',
	[MetadataField.PageCount]: 'pageCount',
	[MetadataField.VolumeCount]: 'volume',
}

/**
 * Maps MetadataField to i18n labels
 */
export const FIELD_BINDING_NAME: Partial<Record<MetadataField, string>> = {
	[MetadataField.Genres]: 'genres',
	[MetadataField.Tags]: 'tags',
	[MetadataField.Authors]: 'authors',
	[MetadataField.Artists]: 'artists',
	[MetadataField.Writers]: 'writers',
	[MetadataField.Colorists]: 'colorists',
	[MetadataField.Letterers]: 'letterers',
	[MetadataField.CoverArtists]: 'coverArtists',
}

export function isArrayField(field: MetadataField): boolean {
	return FIELD_EDITOR_MAP[field] === 'badgeList'
}
