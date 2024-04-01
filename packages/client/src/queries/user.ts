import {
	getUserPreferences,
	updatePreferences,
	updateUser,
	updateUserPreferences as updateUserPreferencesFn,
	updateViewer,
	userApi,
	userQueryKeys,
} from '@stump/api'
import type {
	CreateUser,
	LoginActivity,
	UpdateUser,
	UpdateUserPreferences,
	User,
	UserPreferences,
} from '@stump/types'
import { AxiosError } from 'axios'

import {
	MutationOptions,
	PageQueryOptions,
	QueryOptions,
	useMutation,
	usePageQuery,
	useQuery,
} from '../client'

type UseUsersQueryParams = PageQueryOptions<User> & {
	params?: Record<string, unknown>
}
export function useUsersQuery({ params, ...options }: UseUsersQueryParams = {}) {
	const { data, ...restReturn } = usePageQuery(
		[userQueryKeys.getUsers, params],
		async ({ page = 1, page_size }) => {
			const { data } = await userApi.getUsers({ page, page_size, ...params })
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

type UseUserQuery = {
	id: string
} & QueryOptions<User>
export function useUserQuery({ id, ...options }: UseUserQuery) {
	const { data, ...restReturn } = useQuery(
		[userQueryKeys.getUserById, id],
		async () => {
			const { data } = await userApi.getUserById(id)
			return data
		},
		options,
	)

	return {
		user: data,
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

type UseUpdateUserParams = MutationOptions<User, AxiosError, UpdateUser>
export function useUpdateUser(id?: string, params: UseUpdateUserParams = {}) {
	updateViewer

	const { mutateAsync, isLoading, error } = useMutation(
		[userQueryKeys.updateUser, id],
		async (params: UpdateUser) => {
			const response = id ? await updateUser(id, params) : await updateViewer(params)
			return response.data
		},
		params,
	)

	return {
		error,
		isLoading,
		updateAsync: mutateAsync,
	}
}

type UseUpdatePreferencesParams = MutationOptions<UserPreferences, AxiosError, UserPreferences>

export function useUpdatePreferences(params: UseUpdatePreferencesParams = {}) {
	const { mutateAsync: update, isLoading } = useMutation(
		[userQueryKeys.updateUserPreferences],
		async (preferences: UpdateUserPreferences) => {
			const response = await updatePreferences(preferences)
			return response.data
		},
		params,
	)

	// TODO: This ~should~ be safe, but the type generation is misleading. Any field with a default
	// serde attribute is being marked as optional, which largely makes sense but causes issues here.
	// The solution at this point would probably be to actually implement a patch for user preferences
	const unsafePatch = async (input: Partial<UpdateUserPreferences>) =>
		update(input as UpdateUserPreferences)

	return {
		isLoading,
		unsafePatch,
		update,
	}
}

export function useCreateUser(options?: MutationOptions<User, AxiosError, CreateUser>) {
	const {
		mutateAsync: createAsync,
		mutate: create,
		isLoading,
		...restReturn
	} = useMutation(
		[userQueryKeys.createUser],
		async (params: CreateUser) => {
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

type UseLoginActivityQueryOptions = {
	userId?: string
} & QueryOptions<LoginActivity[]>
export function useLoginActivityQuery({ userId, ...options }: UseLoginActivityQueryOptions) {
	const { data: loginActivity, ...restReturn } = useQuery(
		// This is a bit pedantic and not strictly necessary, but w/e
		[userId ? userQueryKeys.getLoginActivityForUser : userQueryKeys.getLoginActivity, userId],
		async () => {
			const response = userId
				? await userApi.getLoginActivityForUser(userId)
				: await userApi.getLoginActivity()
			return response.data
		},
		options,
	)

	return {
		loginActivity,
		...restReturn,
	}
}
