import { Library, Media, PageInfo, Series } from './core'
import { ApiError } from './server'

export type ApiResult<T> = import('axios').AxiosResponse<T, import('axios').AxiosError<ApiError>>

export enum FileStatus {
	Unknown = 'UNKNOWN',
	Ready = 'READY',
	Unsupported = 'UNSUPPORTED',
	Error = 'ERROR',
	Missing = 'MISSING',
}

export interface Pageable<T> {
	// The target data being returned.
	data: T
	// The pagination information (if paginated).
	_page?: PageInfo
}

export type PageableApiResult<T> = ApiResult<Pageable<T>>

// Note: I am separating these options / exclusions in case I want to use either independently.
export type MediaOrderByExclusions = Extract<
	keyof Media,
	'currentPage' | 'series' | 'readProgresses' | 'tags' | 'id'
>
export type MediaOrderByOptions = Partial<Omit<Media, MediaOrderByExclusions>>
// TODO: I HATE THIS
export const mediaOrderByOptions: MediaOrderByOptions = {
	checksum: undefined,
	description: undefined,
	extension: undefined,
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

export * from './core'
export * from './server'
