import type { ApiResult } from '@stump/api'

// TODO: remove all of these export * from x
export * from './auth'
export * from './epub'
export * from './filesystem'
export * from './job'
export * from './library'
export * from './media'
export * from './series'
export * from './server'
export * from './tag'
export * from './user'

// TODO: remove all these!!

export interface QueryCallbacks<T> {
	onSuccess?: (data?: T | null) => void
	onError?: (data: unknown) => void
}

export interface CreateCallbacks<T> {
	onCreated?: (data: T) => void
	onCreateFailed?: (res: ApiResult<T>) => void
	onError?: (data: unknown) => void
}

export interface UpdateCallbacks<T> {
	onUpdated?: (data: T) => void
	onUpdateFailed?: (res: ApiResult<T>) => void
	onError?: (data: unknown) => void
}

export interface DeleteCallbacks<T> {
	onDeleted?: (data: T) => void
	onDeleteFailed?: (res: ApiResult<T>) => void
	onError?: (data: unknown) => void
}

// TODO: this is a pain. refactor. I am phasing out ClientQueryParams,
// for something that uses these, I either need to separate into
// different hooks, or just create a non-generic options type without much configuration...
export type MutationCallbacks<T> = CreateCallbacks<T> & UpdateCallbacks<T> & DeleteCallbacks<T>
export type ClientQueryParams<T> = QueryCallbacks<T> & MutationCallbacks<T>
