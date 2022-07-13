// Probably won't use this lol sometimes I just mix the languages
export type Option<T> = T | undefined | null;

export type ApiResult<T, E = any> = import('axios').AxiosResponse<T, import('axios').AxiosError>;

export interface PageInfo {
	// The number of pages available.
	totalPages: number;
	// The current page, zero-indexed.
	currentPage: number;
	// The number of elements per page.
	pageSize: number;
	// The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20.
	pageOffset: number;
}

export interface Pageable<T> {
	// The target data being returned.
	data: T;
	// The pagination information (if paginated).
	_page?: PageInfo;
}

export type PageableApiResult<T> = ApiResult<Pageable<T>>;

export * from './Epub';
export * from './Job';
export * from './Library';
export * from './ListDirectory';
export * from './Locale';
export * from './Log';
export * from './Media';
export * from './Preference';
export * from './ReadProgress';
export * from './Series';
export * from './Tag';
export * from './User';
