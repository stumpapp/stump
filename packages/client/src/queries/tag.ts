import { ApiResult, createTags, getAllTags } from '@stump/api'
import type { Tag } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

import { queryClient, useMutation, useQuery } from '../client'

export interface UseTagsConfig {
	onQuerySuccess?: (res: ApiResult<Tag[]>) => void
	onQueryError?: (err: AxiosError) => void
	onCreateSuccess?: (res: ApiResult<Tag[]>) => void
	onCreateError?: (err: AxiosError) => void
}

export interface TagOption {
	label: string
	value: string
}

// TODO: fix type error :grimacing:
export function useTags({
	onQuerySuccess,
	onQueryError,
	onCreateSuccess,
	onCreateError,
}: UseTagsConfig = {}) {
	const { data, isLoading, refetch } = useQuery(['getAllTags'], getAllTags, {
		onError: onQueryError,
		onSuccess: onQuerySuccess,
		suspense: false,
	})

	const {
		mutate,
		mutateAsync,
		isLoading: isCreating,
	} = useMutation(['createTags'], createTags, {
		onError: onCreateError,
		onSuccess(res) {
			onCreateSuccess?.(res)

			queryClient.refetchQueries(['getAllTags'])
		},
	})

	const { tags, options } = useMemo(() => {
		if (data && data.data) {
			const tagOptions = data.data?.map(
				(tag) =>
					({
						label: tag.name,
						value: tag.name,
					} as TagOption),
			)

			return { options: tagOptions, tags: data.data }
		}

		return { options: [], tags: [] }
	}, [data])

	return {
		createTags: mutate,
		createTagsAsync: mutateAsync,
		isCreating,
		isLoading,
		options,
		refetch,
		tags,
	}
}
