import {
	getUserPreferences,
	getUsers,
	updatePreferences,
	updateUser,
	updateUserPreferences as updateUserPreferencesFn,
	updateViewer,
	userApi,
} from '@stump/api'
import type { LoginOrRegisterArgs, UpdateUserArgs, User, UserPreferences } from '@stump/types'
import { AxiosError } from 'axios'

import { MutationOptions, QueryOptions, useMutation, useQuery } from '../client'

type UseUsersQueryParams = QueryOptions<User[], AxiosError, User[]> & {
	params?: Record<string, unknown>
}
export function useUsersQuery({ params, ...options }: UseUsersQueryParams = {}) {
	const { data: users, ...ret } = useQuery(
		['getUsers', params],
		() => getUsers(params).then((res) => res.data),
		options,
	)

	return { users, ...ret }
}

type UseUserPreferencesParams = {
	enableFetchPreferences?: boolean
} & MutationOptions<UserPreferences, AxiosError, UserPreferences>

export function useUserPreferences(
	id?: string,
	{ enableFetchPreferences, ...mutationOptions }: UseUserPreferencesParams = {},
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
		(preferences: UserPreferences) =>
			updateUserPreferencesFn(id!, preferences).then((res) => res.data),
		mutationOptions,
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

export function useCreateUser(options?: MutationOptions<User, AxiosError, LoginOrRegisterArgs>) {
	const {
		mutateAsync: createAsync,
		mutate: create,
		isLoading,
		...restReturn
	} = useMutation(
		['createUser'],
		async (params: LoginOrRegisterArgs) => {
			const { data } = await userApi.createUser(params)
			return data
		},
		options,
	)

	return {
		create,
		createAsync,
		isLoading,
		...restReturn,
	}
}
