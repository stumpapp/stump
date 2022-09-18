import { PageInfo, Media, Series, Library } from './generated';

export type ApiResult<T, E = any> = import('axios').AxiosResponse<T, import('axios').AxiosError>;

export enum FileStatus {
	Unknown = 'UNKNOWN',
	Ready = 'READY',
	Unsupported = 'UNSUPPORTED',
	Error = 'ERROR',
	Missing = 'MISSING',
}

export interface Pageable<T> {
	// The target data being returned.
	data: T;
	// The pagination information (if paginated).
	_page?: PageInfo;
}

export type PageableApiResult<T> = ApiResult<Pageable<T>>;

// Note: I am separating these options / exclusions in case I want to use either independently.
export type MediaOrderByExclusions = Extract<
	keyof Media,
	'currentPage' | 'series' | 'readProgresses' | 'tags'
>;
export type MediaOrderByOptions = Omit<Media, MediaOrderByExclusions>;

export type SeriesOrderByExclusions = Extract<
	keyof Series,
	'library' | 'media' | 'mediaCount' | 'tags'
>;
export type SeriesOrderOptions = Omit<Series, SeriesOrderByExclusions>;

export type LibraryOrderByExclusions = Extract<keyof Library, 'series' | 'tags' | 'libraryOptions'>;
export type LibraryOrderOptions = Omit<Library, LibraryOrderByExclusions>;

export * from './generated';
