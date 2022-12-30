import { useMutation, useQuery } from '@tanstack/react-query';

import { getUserPreferences, updateUserPreferences as updateUserPreferencesFn } from '../api/user';
import { StumpQueryContext } from '../context';
import type { UserPreferences } from '../types';
import { ClientQueryParams } from '.';

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
		context: StumpQueryContext,
		enabled: enableFetchPreferences && !!id,
	});

	const { mutateAsync: updateUserPreferences, isLoading: isUpdating } = useMutation(
		['updateUserPreferences', id],
		(preferences: UserPreferences) => updateUserPreferencesFn(id!, preferences),
		{
			context: StumpQueryContext,
			onSuccess(res) {
				onUpdated?.(res.data);
			},
		},
	);

	return {
		isLoadingPreferences: isLoading || isFetching || isRefetching,
		isUpdating,
		updateUserPreferences,
		userPreferences,
	};
}
