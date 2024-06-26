import { CursorInfo, Library, Media, PageInfo, Series, User } from './generated'

export const isUser = (data: unknown): data is User => {
	const casted = data as User
	return casted?.id !== undefined && casted?.is_server_owner !== undefined
}

export enum FileStatus {
	Unknown = 'UNKNOWN',
	Ready = 'READY',
	Unsupported = 'UNSUPPORTED',
	Error = 'ERROR',
	Missing = 'MISSING',
}

export type APIError =
	| { code: 'BadRequest'; details: string }
	| { code: 'NotFound'; details: string }
	| { code: 'InternalServerError'; details: string }
	| { code: 'Unauthorized'; details: string }
	| { code: 'Forbidden'; details: string }
	| { code: 'NotImplemented'; details: string }
	| { code: 'ServiceUnavailable'; details: string }
	| { code: 'BadGateway'; details: string }
	| { code: 'Unknown'; details: string }
	| { code: 'Redirect'; details: string }

export interface Pageable<T> {
	// The target data being returned.
	data: T
	// The pagination information (if paginated).
	_page?: PageInfo
	// The cursor information (if cursor based).
	_cursor?: CursorInfo
}

// Note: I am separating these options / exclusions in case I want to use either independently.
export type MediaOrderByExclusions = Extract<
	keyof Media,
	'currentPage' | 'series' | 'readProgresses' | 'tags' | 'id'
>
export type MediaOrderByOptions = Partial<Omit<Media, MediaOrderByExclusions>>
// TODO: I HATE THIS
export const mediaOrderByOptions: MediaOrderByOptions = {
	extension: undefined,
	hash: undefined,
	name: undefined,
	pages: undefined,
	path: undefined,
	series_id: undefined,
	size: undefined,
	status: undefined,
	updated_at: undefined,
}

export type SeriesOrderByExclusions = Extract<
	keyof Series,
	'library' | 'media' | 'mediaCount' | 'tags'
>
export type SeriesOrderByOptions = Partial<Omit<Series, SeriesOrderByExclusions>>
// TODO: I HATE THIS
export const seriesOrderByOptions: SeriesOrderByOptions = {
	description: undefined,
	library_id: undefined,
	name: undefined,
	path: undefined,
	status: undefined,
	updated_at: undefined,
}

export type LibraryOrderByExclusions = Extract<keyof Library, 'series' | 'tags' | 'libraryOptions'>
export type LibraryOrderByOptions = Partial<Omit<Library, LibraryOrderByExclusions>>
// TODO: I HATE THIS
export const libraryOrderByOptions: LibraryOrderByOptions = {
	description: undefined,
	name: undefined,
	path: undefined,
	status: undefined,
	updated_at: undefined,
}

export * from './generated'
