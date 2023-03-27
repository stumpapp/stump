import {
	getUserPreferences,
	getUsers,
	updatePreferences,
	updateUser,
	updateUserPreferences as updateUserPreferencesFn,
	updateViewer,
} from '@stump/api'
import type { UpdateUserArgs, User, UserPreferences } from '@stump/types'
import { AxiosError } from 'axios'

import { MutationOptions, QueryOptions, useMutation, useQuery } from '../client'
import { ClientQueryParams } from '.'

type UseUsersQueryParams = QueryOptions<User[], AxiosError, User[]>
export function useUsersQuery(params: UseUsersQueryParams = {}) {
	const { data: users, ...ret } = useQuery(
		['getUsers'],
		() => getUsers().then((res) => res.data),
		params,
	)

	return { users, ...ret }
}

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

type UseUpdateUserParams = MutationOptions<User, AxiosError, UpdateUserArgs>
export function useUpdateUser(id?: string, params: UseUpdateUserParams = {}) {
	updateViewer

	const { mutateAsync: update, isLoading } = useMutation(
		['updateUser', id],
		async (params: UpdateUserArgs) => {
			const response = id ? await updateUser(id, params) : await updateViewer(params)
			return response.data
		},
		params,
	)

	return {
		isLoading,
		update,
	}
}

type UseUpdatePreferencesParams = MutationOptions<UserPreferences, AxiosError, UserPreferences>

export function useUpdatePreferences(params: UseUpdatePreferencesParams = {}) {
	const { mutateAsync: update, isLoading } = useMutation(
		['updateUserPreferences'],
		async (preferences: UserPreferences) => {
			const response = await updatePreferences(preferences)
			return response.data
		},
		params,
	)

	return {
		isLoading,
		update,
	}
}
