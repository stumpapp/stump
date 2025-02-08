import { match, P } from 'ts-pattern'

import {
	LibraryOrderBy,
	MediaMetadataOrderBy,
	MediaOrderBy,
	SeriesMetadataOrderBy,
	SeriesOrderBy,
	UserPermission,
} from './generated'

const filterEntity = [
	'media',
	'media_metadata',
	'series',
	'series_metadata',
	'library',
	'log',
] as const
export type FilterEntity = (typeof filterEntity)[number]

export const isFilterEntity = (value: unknown): value is FilterEntity =>
	filterEntity.includes(value as FilterEntity)

export const isMediaOrderBy = (value: unknown): value is MediaOrderBy => {
	const isBaseOrder = [
		'name',
		'size',
		'extension',
		'created_at',
		'updated_at',
		'status',
		'path',
		'pages',
	].includes(value as string)

	if (isBaseOrder) {
		return true
	}

	return match(value as object)
		.with(P.array, () => false)
		.with({ metadata: P.array(P.string) }, ({ metadata }) => metadata.every(isMediaMetadataOrderBy))
		.otherwise(() => false)
}

export const isMediaMetadataOrderBy = (value: unknown): value is MediaMetadataOrderBy =>
	[
		'number',
		'series',
		'title',
		'volume',
		'summary',
		'notes',
		'age_rating',
		'genre',
		'year',
		'month',
		'day',
		'writers',
		'pencillers',
		'inkers',
		'colorists',
		'letterers',
		'cover_artists',
		'editors',
		'publisher',
		'links',
		'characters',
		'teams',
	].includes(value as string)

export const isSeriesOrderBy = (value: unknown): value is SeriesOrderBy =>
	['name', 'created_at', 'updated_at', 'status', 'path', 'description'].includes(value as string)

export const isSeriesMetadataOrderBy = (value: unknown): value is SeriesMetadataOrderBy =>
	[
		'title',
		'meta_type',
		'summary',
		'publisher',
		'imprint',
		'comicid',
		'volume',
		'booktype',
		'age_rating',
		'status',
	].includes(value as string)

export const isLibraryOrderBy = (value: unknown): value is LibraryOrderBy =>
	['name', 'created_at', 'updated_at', 'status', 'path'].includes(value as string)

export const allPermissions = [
	'bookclub:read',
	'bookclub:create',
	'email:arbitrary_send',
	'email:send',
	'emailer:create',
	'emailer:manage',
	'emailer:read',
	'feature:api_keys',
	'feature:koreader_sync',
	'file:explorer',
	'file:upload',
	'file:download',
	'library:create',
	'library:edit',
	'library:scan',
	'library:manage',
	'library:delete',
	'user:read',
	'user:manage',
	'server:manage',
	'smartlist:read',
	'notifier:read',
	'notifier:create',
	'notifier:delete',
	'notifier:manage',
] as UserPermission[]

export const isUserPermission = (permission: string): permission is UserPermission =>
	allPermissions.includes(permission as UserPermission)
