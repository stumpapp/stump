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

export interface CreateCallbacks<T> {
	onCreated?: (data: T) => void;
	onCreateFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export interface UpdateCallbacks<T> {
	onUpdated?: (data: T) => void;
	onUpdateFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export interface DeleteCallbacks<T> {
	onDeleted?: (data: T) => void;
	onDeleteFailed?: (res: ApiResult<T>) => void;
	onError?: (data: unknown) => void;
}

export type MutationCallbacks<T> = CreateCallbacks<T> & UpdateCallbacks<T> & DeleteCallbacks<T>;

export type ClientQueryParams<T> = QueryCallbacks<T> & MutationCallbacks<T>;

// TODO: I think it would be better to split up some of my mutations into updates
// and creates. I think that would make it easier to handle errors and loading states.
