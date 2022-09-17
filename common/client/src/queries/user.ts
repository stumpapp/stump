import { UserPreferences } from '@stump/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ClientQueryParams } from '.';
import { getUserPreferences, updateUserPreferences as updateUserPreferencesFn } from '../api/user';
import { StumpQueryContext } from '../context';

interface UseUserPreferencesParams extends ClientQueryParams<UserPreferences> {
	enableFetchPreferences?: boolean;
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
		context: StumpQueryContext,
	});

	const { mutateAsync: updateUserPreferences, isLoading: isUpdating } = useMutation(
		['updateUserPreferences', id],
		(preferences: UserPreferences) => updateUserPreferencesFn(id!, preferences),
		{
			onSuccess(res) {
				onUpdated?.(res.data);
			},
			context: StumpQueryContext,
		},
	);

	return {
		isLoadingPreferences: isLoading || isFetching || isRefetching,
		userPreferences,
		updateUserPreferences,
		isUpdating,
	};
}
