import { QueryFunction, QueryKey, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StumpQueryContext } from '../context';
import { useCounter } from '../hooks/useCounter';
import type { ApiResult, Pageable, PageableApiResult } from '../types';

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

export function usePagedQuery<T>(
	key: string,
	queryFn: (page: number, params?: URLSearchParams) => Promise<PageableApiResult<T[]>>,
	options: QueryCallbacks<Pageable<T[]>> = {},
	params?: URLSearchParams,
) {
	const [page, actions] = useCounter(1);
	const {
		data: result,
		isLoading,
		isFetching,
		isRefetching,
		refetch,
	} = useQuery([key, page, params], {
		queryFn: () => queryFn(page, params).then((res) => res.data),
		...options,
		context: StumpQueryContext,
	});

	function setPage(page: number) {
		actions.set(page);
	}

	function nextPage() {
		actions.increment();
	}

	function prevPage() {
		actions.decrement();
	}

	function hasMore() {
		if (!result?._page) {
			return false;
		}

		return result._page.current_page < result._page.total_pages;
	}

	return {
		isLoading: isLoading || isFetching || isRefetching,
		data: result?.data,
		refetch,
		page,
		setPage,
		nextPage,
		prevPage,
		hasMore,
	};
}
