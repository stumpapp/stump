import type { Tag } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

import { useSDK } from '@/sdk'

import { queryClient, useMutation, useQuery } from '../client'

export interface UseTagsConfig {
	onQuerySuccess?: (res: Tag[]) => void
	onQueryError?: (err: AxiosError) => void
	onCreateSuccess?: (res: Tag[]) => void
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
	const { sdk } = useSDK()
	const { data, isLoading, refetch } = useQuery([sdk.tag.keys.get], sdk.tag.get, {
		onError: onQueryError,
		onSuccess: onQuerySuccess,
		suspense: false,
	})

	const {
		mutate,
		mutateAsync,
		isLoading: isCreating,
	} = useMutation([sdk.tag.keys.create], sdk.tag.create, {
		onError: onCreateError,
		onSuccess(res) {
			onCreateSuccess?.(res)
			queryClient.refetchQueries([sdk.tag.keys.get])
		},
	})

	const { tags, options } = useMemo(() => {
		if (data) {
			const tagOptions = data.map(
				(tag) =>
					({
						label: tag.name,
						value: tag.name,
					}) as TagOption,
			)

			return { options: tagOptions, tags: data }
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
