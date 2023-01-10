import { getUserPreferences, updateUserPreferences as updateUserPreferencesFn } from '@stump/api'
import type { UserPreferences } from '@stump/types'

import { useMutation, useQuery } from '../client'
import { ClientQueryParams } from '.'

interface UseUserPreferencesParams extends ClientQueryParams<UserPreferences> {
	enableFetchPreferences?: boolean
}

export function useUserPreferences(
	id?: string,
	{ enableFetchPreferences, onUpdated }: UseUserPreferencesParams = {},
) {
	const {
		data: userPreferences,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(['getUserPreferences', id], () => getUserPreferences(id!).then((res) => res.data), {
		enabled: enableFetchPreferences && !!id,
	})

	const { mutateAsync: updateUserPreferences, isLoading: isUpdating } = useMutation(
		['updateUserPreferences', id],
		(preferences: UserPreferences) => updateUserPreferencesFn(id!, preferences),
		{
			onSuccess(res) {
				onUpdated?.(res.data)
			},
		},
	)

	return {
		isLoadingPreferences: isLoading || isFetching || isRefetching,
		isUpdating,
		updateUserPreferences,
		userPreferences,
	}
}
