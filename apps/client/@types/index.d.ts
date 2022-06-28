// Probably won't use this lol sometimes I just mix the languages
type Option<T> = T | undefined | null;

type ApiResult<T, E = any> = import('axios').AxiosResponse<T, import('axios').AxiosError>;

interface PageInfo {
	// The number of pages available.
	totalPages: number;
	// The current page, zero-indexed.
	currentPage: number;
	// The number of elements per page.
	pageSize: number;
	// The offset of the current page. E.g. if current page is 1, and pageSize is 10, the offset is 20.
	pageOffset: number;
}

interface Pageable<T> {
	// The target data being returned.
	data: T;
	// The pagination information (if paginated).
	_page?: PageInfo;
}

type PageableApiResult<T> = ApiResult<Pageable<T>>;
