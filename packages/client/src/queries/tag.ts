import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useMemo } from 'react';

import { createTags, getAllTags } from '../api/tag';
import { queryClient } from '../client';
import { StumpQueryContext } from '../context';
import type { ApiResult, Tag } from '../types';

export interface UseTagsConfig {
	onQuerySuccess?: (res: ApiResult<Tag[]>) => void;
	onQueryError?: (err: AxiosError) => void;
	onCreateSuccess?: (res: ApiResult<Tag[]>) => void;
	onCreateError?: (err: AxiosError) => void;
}

export interface TagOption {
	label: string;
	value: string;
}

export function useTags({
	onQuerySuccess,
	onQueryError,
	onCreateSuccess,
	onCreateError,
}: UseTagsConfig = {}) {
	const { data, isLoading, refetch } = useQuery(['getAllTags'], {
		context: StumpQueryContext,
		onError: onQueryError,
		onSuccess: onQuerySuccess,
		queryFn: getAllTags,
		suspense: false,
	});

	const {
		mutate,
		mutateAsync,
		isLoading: isCreating,
	} = useMutation(['createTags'], {
		context: StumpQueryContext,
		mutationFn: createTags,
		onError: onCreateError,
		onSuccess(res) {
			onCreateSuccess?.(res);

			queryClient.refetchQueries(['getAllTags']);
		},
	});

	const { tags, options } = useMemo(() => {
		if (data && data.data) {
			const tagOptions = data.data?.map(
				(tag) =>
					({
						label: tag.name,
						value: tag.name,
					} as TagOption),
			);

			return { options: tagOptions, tags: data.data };
		}

		return { options: [], tags: [] };
	}, [data]);

	return {
		createTags: mutate,
		createTagsAsync: mutateAsync,
		isCreating,
		isLoading,
		options,
		refetch,
		tags,
	};
}
