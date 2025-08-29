import { MediaMetadataEditorFragment, SeriesMetadataEditorFragment } from '@stump/graphql'

export type MetadataEditorRow<Field extends string> = {
	label: string
	field: Field
}

export type MediaMetadataField = keyof Omit<
	MediaMetadataEditorFragment,
	'__typename' | ' $fragmentName' | 'mediaId'
>

export type MediaMetadataArrayField = Extract<
	MediaMetadataField,
	| 'characters'
	| 'colorists'
	| 'coverArtists'
	| 'editors'
	| 'genres'
	| 'inkers'
	| 'letterers'
	| 'links'
	| 'pencillers'
	| 'teams'
	| 'writers'
>

export type MediaMetadataEditorRow = MetadataEditorRow<MediaMetadataField>

export const MediaMetadataKeys: MediaMetadataField[] = [
	'ageRating',
	'characters',
	'colorists',
	'coverArtists',
	'day',
	'editors',
	'identifierAmazon',
	'identifierCalibre',
	'identifierGoogle',
	'identifierIsbn',
	'identifierMobiAsin',
	'identifierUuid',
	'genres',
	'inkers',
	'language',
	'letterers',
	'links',
	'month',
	'notes',
	'number',
	'pageCount',
	'pencillers',
	'publisher',
	'series',
	'summary',
	'teams',
	'title',
	'titleSort',
	'volume',
	'writers',
	'year',
]

export type SeriesMetadataField = keyof Omit<
	SeriesMetadataEditorFragment,
	'__typename' | ' $fragmentName' | 'seriesId'
>

export type SeriesMetadataEditorRow = MetadataEditorRow<SeriesMetadataField>

export const SeriesMetadataKeys: SeriesMetadataField[] = [
	'ageRating',
	'booktype',
	'characters',
	'comicid',
	'genres',
	'imprint',
	'links',
	'metaType',
	'publisher',
	'status',
	'summary',
	'title',
	'volume',
	'writers',
]
