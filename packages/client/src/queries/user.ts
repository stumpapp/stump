import {
	getUserPreferences,
	updatePreferences,
	updateUser,
	updateUserPreferences as updateUserPreferencesFn,
	updateViewer,
	userApi,
	userQueryKeys,
} from '@stump/api'
import type { LoginOrRegisterArgs, UpdateUserArgs, User, UserPreferences } from '@stump/types'
import { AxiosError } from 'axios'

import { MutationOptions, PageQueryOptions, useMutation, usePageQuery, useQuery } from '../client'

type UseUsersQueryParams = PageQueryOptions<User> & {
	params?: Record<string, unknown>
}
export function useUsersQuery({ params, ...options }: UseUsersQueryParams = {}) {
	const { data, ...restReturn } = usePageQuery(
		[userQueryKeys.getUsers, params],
		async ({ page = 1, ...rest }) => {
			const { data } = await userApi.getUsers({ page, ...rest })
			return data
		},
		{
			keepPreviousData: true,
			...options,
		},
	)

	const users = data?.data
	const pageData = data?._page

	return {
		pageData,
		users,
		...restReturn,
	}
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
	} = useQuery(
		[userQueryKeys.getUserPreferences, id],
		() => getUserPreferences(id!).then((res) => res.data),
		{
			enabled: enableFetchPreferences && !!id,
		},
	)

	const { mutateAsync: updateUserPreferences, isLoading: isUpdating } = useMutation(
		[userQueryKeys.updateUserPreferences, id],
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
		[userQueryKeys.updateUser, id],
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
		[userQueryKeys.updateUserPreferences],
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
		[userQueryKeys.createUser],
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

export type UseDeleteUserOptions = {
	userId: string
	hardDelete?: boolean
} & MutationOptions<User, AxiosError>
export function useDeleteUser(options: UseDeleteUserOptions) {
	const { hardDelete, userId, ...mutationOptions } = options
	const { mutateAsync: deleteAsync, ...restReturn } = useMutation(
		[userQueryKeys.deleteUser, userId, hardDelete],
		async () => {
			const { data } = await userApi.deleteUser({ hardDelete, userId })
			return data
		},
		mutationOptions,
	)

	return {
		deleteAsync,
		...restReturn,
	}
}
