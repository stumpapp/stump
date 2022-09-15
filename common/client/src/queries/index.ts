import { ApiResult } from '@stump/core';

export * from './auth';
export * from './epub';
export * from './filesystem';
export * from './job';
export * from './library';
export * from './media';
export * from './series';
export * from './tag';
export * from './server';
export * from './user';

export interface QueryCallbacks<T> {
	onSuccess?: (data?: T | null) => void;
	onError?: (data: unknown) => void;
}

export interface MutationCallbacks<T> {
	onCreated?: (data: T) => void;
	onUpdated?: (data: T) => void;
	onDeleted?: (data: T) => void;
	onCreateFailed?: (res: ApiResult<T>) => void;
	onUpdateFailed?: (res: ApiResult<T>) => void;
	onDeleteFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export type ClientQueryParams<T> = QueryCallbacks<T> & MutationCallbacks<T>;
