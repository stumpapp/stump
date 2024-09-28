import type {
	Arrangement,
	CreateUser,
	LoginActivity,
	NavigationItem,
	UpdateUser,
	UpdateUserPreferences,
	User,
	UserPreferences,
} from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo } from 'react'

import { useSDK } from '@/sdk'

import {
	MutationOptions,
	PageQueryOptions,
	queryClient,
	QueryOptions,
	useMutation,
	usePageQuery,
	useQuery,
} from '../client'

type UseUsersQueryParams = PageQueryOptions<User> & {
	params?: Record<string, unknown>
}
export function useUsersQuery({ params, ...options }: UseUsersQueryParams = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = usePageQuery(
		[sdk.user.keys.get, params],
		async ({ page = 1, page_size }) => sdk.user.get({ page, page_size, ...params }),
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
	const { sdk } = useSDK()
	const { data, ...restReturn } = useQuery(
		[sdk.user.keys.getByID, id],
		async () => sdk.user.getByID(id),
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
	const { sdk } = useSDK()
	const {
		data: userPreferences,
		isLoading,
		isFetching,
		isRefetching,
	} = useQuery(
		[sdk.user.keys.getUserPreferences, id],
		() => sdk.user.getUserPreferences(id || ''),
		{
			enabled: enableFetchPreferences && !!id,
		},
	)

	const { mutateAsync: updateUserPreferences, isLoading: isUpdating } = useMutation(
		[sdk.user.keys.updateUserPreferences, id],
		(preferences: UpdateUserPreferences) => sdk.user.updateUserPreferences(id || '', preferences),
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
	const { sdk } = useSDK()
	const { mutateAsync, isLoading, error } = useMutation(
		[sdk.user.keys.update, id],
		async (params: UpdateUser) =>
			id ? await sdk.user.update(id, params) : await sdk.user.updateViewer(params),
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
	const { sdk } = useSDK()
	const { mutateAsync: update, isLoading } = useMutation(
		[sdk.user.keys.updateUserPreferences],
		async (preferences: UpdateUserPreferences) => sdk.user.updatePreferences(preferences),
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
	const { sdk } = useSDK()
	const {
		mutateAsync: createAsync,
		mutate: create,
		isLoading,
		...restReturn
	} = useMutation(
		[sdk.user.keys.create],
		async (params: CreateUser) => sdk.user.create(params),
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
	const { sdk } = useSDK()
	const { hardDelete, userId, ...mutationOptions } = options
	const { mutateAsync: deleteAsync, ...restReturn } = useMutation(
		[sdk.user.keys.delete, userId, hardDelete],
		async () => sdk.user.delete(userId, { hardDelete }),
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
	const { sdk } = useSDK()
	const { data: loginActivity, ...restReturn } = useQuery(
		// This is a bit pedantic and not strictly necessary, but w/e
		[sdk.user.keys.loginActivity, userId],
		async () => sdk.user.loginActivity(userId),
		options,
	)

	return {
		loginActivity,
		...restReturn,
	}
}

type UseNavigationArrangementOptions = {
	defaultArrangement?: Arrangement<NavigationItem>
} & QueryOptions<Arrangement<NavigationItem>>
export function useNavigationArrangement({
	defaultArrangement = defaultNavigationArrangement,
	...options
}: UseNavigationArrangementOptions = {}) {
	const { sdk } = useSDK()
	const { data } = useQuery([sdk.user.keys.navigationArrangement], sdk.user.navigationArrangement, {
		suspense: true,
		...options,
	})

	const {
		mutateAsync: updateArrangement,
		error: updateError,
		isLoading: isUpdating,
	} = useMutation(
		[sdk.user.keys.updateNavigationArrangement],
		async (arrangement: Arrangement<NavigationItem>) =>
			sdk.user.updateNavigationArrangement(arrangement),
		{
			onError: (_, newArrangement, ctx) => {
				console.warn('Failed to update navigation arrangement', newArrangement)
				queryClient.setQueryData([sdk.user.keys.navigationArrangement], ctx?.previousArrangement)
			},
			onMutate: async (arrangement: Arrangement<NavigationItem>) => {
				await queryClient.cancelQueries([sdk.user.keys.navigationArrangement])
				const previousArrangement = queryClient.getQueryData<Arrangement<NavigationItem>>([
					sdk.user.keys.navigationArrangement,
				])
				queryClient.setQueryData([sdk.user.keys.navigationArrangement], arrangement)
				return { previousArrangement }
			},
			onSettled: () => queryClient.invalidateQueries([sdk.user.keys.navigationArrangement]),
		},
	)

	const arrangement = useMemo(() => data ?? defaultArrangement, [data, defaultArrangement])

	return {
		arrangement,
		isUpdating,
		updateArrangement,
		updateError,
	}
}

const defaultNavigationArrangement: Arrangement<NavigationItem> = {
	items: [
		{ item: { type: 'Home' }, visible: true },
		{ item: { type: 'Explore' }, visible: true },
		{ item: { show_create_action: true, type: 'Libraries' }, visible: true },
		{ item: { show_create_action: true, type: 'SmartLists' }, visible: true },
		{ item: { show_create_action: true, type: 'BookClubs' }, visible: true },
	],
	locked: true,
}
