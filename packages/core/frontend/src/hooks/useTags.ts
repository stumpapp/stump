import { AxiosError } from 'axios';
import { useMemo } from 'react';
import { useMutation, useQuery } from 'react-query';
import { createTags as createTagsFn, getAllTags } from '~api/query/tag';

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
	const { data, isLoading, refetch } = useQuery('getAllTags', {
		queryFn: getAllTags,
		onSuccess: onQuerySuccess,
		onError: onQueryError,
		suspense: false,
	});

	const {
		mutate: createTags,
		mutateAsync: createTagsAsync,
		isLoading: isCreating,
	} = useMutation('createTags', {
		mutationFn: createTagsFn,
		onSuccess: onCreateSuccess,
		onError: onCreateError,
	});

	const { tags, options } = useMemo(() => {
		if (data && data.data) {
			const tagOptions = data.data.map(
				(tag) =>
					({
						label: tag.name,
						value: tag.name,
					} as TagOption),
			);

			return { tags: data.data, options: tagOptions };
		}

		return { tags: [], options: [] };
	}, [data]);

	return {
		tags,
		options,
		isLoading,
		refetch,
		createTags,
		createTagsAsync,
		isCreating,
	};
}
