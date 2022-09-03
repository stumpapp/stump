import { PageInfo } from './generated';

export type ApiResult<T, E = any> = import('axios').AxiosResponse<T, import('axios').AxiosError>;

export enum FileStatus {
	Unknown = 'UNKNOWN',
	Ready = 'READY',
	Unsupported = 'UNSUPPORTED',
	Error = 'ERROR',
	Missing = 'MISSING',
}

export interface Pageable<T> {
	// The target data being retuxrned.
	data: T;
	// The pagination information (if paginated).
	_page?: PageInfo;
}

export type PageableApiResult<T> = ApiResult<Pageable<T>>;

export * from './generated';
