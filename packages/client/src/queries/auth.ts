import { authApi, authQueryKeys, checkIsClaimed, serverQueryKeys } from '@stump/api'
import { isUser, type User } from '@stump/types'
import { useEffect, useState } from 'react'

import { queryClient, QueryOptions, useMutation, useQuery } from '../client'

export function useAuthQuery(options: QueryOptions<User> = {}) {
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(
		[authQueryKeys.me],
		async () => {
			const { data } = await authApi.me()
			if (!isUser(data)) {
				console.debug('Malformed response recieved from server', data)
				throw new Error('Malformed response recieved from server')
			}
			return data
		},
		{
			useErrorBoundary: false,
			...options,
		},
	)

	return {
		error,
		isLoading: isLoading || isFetching || isRefetching,
		user: data,
	}
}

type UseLoginOrRegisterOptions = {
	onSuccess?: (data?: User | null | undefined) => void
	onError?: (data: unknown) => void
	refetchClaimed?: boolean
}

export function useLoginOrRegister({
	onSuccess,
	onError,
	refetchClaimed,
}: UseLoginOrRegisterOptions) {
	const [isClaimed, setIsClaimed] = useState(true)

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(
		[serverQueryKeys.checkIsClaimed, refetchClaimed],
		checkIsClaimed,
	)

	useEffect(() => {
		if (claimCheck?.data) {
			setIsClaimed(claimCheck.data.is_claimed)
		}
	}, [claimCheck])

	const {
		isLoading: isLoggingIn,
		mutateAsync: loginUser,
		error: loginError,
	} = useMutation(['loginUser'], authApi.login, {
		onError: (err) => {
			onError?.(err)
		},
		onSuccess: (res) => {
			if (!res.data) {
				onError?.(res)
			} else {
				queryClient.invalidateQueries(['getLibraries'])
				onSuccess?.(res.data)
			}
		},
	})

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(
		[authQueryKeys.register],
		authApi.register,
		{
			onSuccess: async () => {
				await queryClient.invalidateQueries([serverQueryKeys.checkIsClaimed])
			},
		},
	)

	return {
		isCheckingClaimed,
		isClaimed,
		isLoggingIn,
		isRegistering,
		loginError,
		loginUser,
		registerUser,
	}
}

type UseLogoutParams = {
	removeStoreUser?: () => void
}

export function useLogout({ removeStoreUser }: UseLogoutParams = {}) {
	const { mutateAsync: logout, isLoading } = useMutation([authQueryKeys.logout], authApi.logout, {
		onSuccess: () => {
			queryClient.clear()
			removeStoreUser?.()
		},
	})

	return { isLoggingOut: isLoading, logout }
}
