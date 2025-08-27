import { MetadataEditorFragment, SeriesMetadataEditorFragment } from '@stump/graphql'

export type MetadataEditorRow<Field extends string> = {
	label: string
	field: Field
}

export type MediaMetadataField = keyof Omit<
	MetadataEditorFragment,
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
	'genres',
	'inkers',
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
	'publisher',
	'summary',
	'title',
	'volume',
	'metaType',
	'imprint',
	'comicid',
	'booktype',
	'status',
]
